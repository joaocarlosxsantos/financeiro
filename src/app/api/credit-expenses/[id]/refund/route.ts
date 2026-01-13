import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  calculateInstallmentDates, 
  calculateRefundDistribution,
  canFullRefund,
  calculateMaxRefundAmount,
  calculateClosingDate,
  calculateDueDate
} from '@/lib/credit-utils';
import { recalculateBillTotal } from '@/lib/credit-bill-utils';
import { triggerBillStatusUpdate } from '@/lib/auto-bill-status';

// Função para processar estorno por parcelas específicas
async function processInstallmentRefund(originalExpense: any, selectedInstallments: number[], userId: string) {
  try {
    // Buscar as parcelas selecionadas
    const selectedChildren = originalExpense.childExpenses.filter((child: any) => 
      selectedInstallments.includes(child.installmentNumber)
    );

    if (selectedChildren.length !== selectedInstallments.length) {
      return NextResponse.json({ 
        error: 'Uma ou mais parcelas selecionadas não foram encontradas' 
      }, { status: 400 });
    }

    // Calcular valor total do estorno
    const totalRefundAmount = selectedChildren.reduce((sum: number, child: any) => 
      sum + Number(child.amount), 0
    );

    const result = await prisma.$transaction(async (tx: any) => {
      const affectedBills = new Set<string>();
      const refundRecords = [];

      // Processar cada parcela selecionada
      for (const child of selectedChildren) {
        const isPaid = child.creditBill?.status === 'PAID';
        
        if (isPaid) {
          // PARCELA PAGA: Gerar crédito na fatura atual do cartão
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();
          
          const currentClosingDate = calculateClosingDate(originalExpense.creditCard, currentYear, currentMonth);
          const currentDueDate = calculateDueDate(originalExpense.creditCard, currentYear, currentMonth);
          
          // Buscar ou criar fatura atual
          let currentBill = await tx.creditBill.findFirst({
            where: {
              creditCardId: originalExpense.creditCardId,
              closingDate: currentClosingDate,
              userId,
            },
          });

          if (!currentBill) {
            currentBill = await tx.creditBill.create({
              data: {
                creditCardId: originalExpense.creditCardId,
                closingDate: currentClosingDate,
                dueDate: currentDueDate,
                totalAmount: 0,
                status: 'PENDING',
                userId,
              },
            });
          }

          // Criar registro de crédito
          const creditRecord = await tx.creditIncome.create({
            data: {
              description: `ESTORNO: ${originalExpense.description} (${child.installmentNumber}/${originalExpense.installments})`,
              amount: Number(child.amount),
              date: now,
              categoryId: originalExpense.categoryId,
              creditCardId: originalExpense.creditCardId,
              creditBillId: currentBill.id,
              userId,
              tags: [],
            },
          });

          refundRecords.push({ type: 'credit', record: creditRecord, installment: child.installmentNumber });
          affectedBills.add(currentBill.id);
          
        } else {
          // PARCELA PENDENTE: Criar estorno na mesma fatura
          if (!child.creditBillId) {
            return NextResponse.json({ 
              error: `Parcela ${child.installmentNumber} não possui fatura associada` 
            }, { status: 400 });
          }

          // Criar registro de estorno
          const refundRecord = await tx.creditIncome.create({
            data: {
              description: `ESTORNO: ${originalExpense.description} (${child.installmentNumber}/${originalExpense.installments})`,
              amount: Number(child.amount),
              date: new Date(),
              categoryId: originalExpense.categoryId,
              creditCardId: originalExpense.creditCardId,
              creditBillId: child.creditBillId, // Mesma fatura da parcela
              userId,
              tags: [],
            },
          });

          refundRecords.push({ type: 'refund', record: refundRecord, installment: child.installmentNumber });
          affectedBills.add(child.creditBillId);
        }

        // NÃO deletar a parcela original - manter na fatura junto com o estorno
        // A fatura ficará zerada: parcela (103) + estorno (-103) = 0
      }

      // NÃO deletar nenhuma parcela - tanto pagas quanto pendentes permanecem
      // Parcelas pagas: recebem crédito na fatura atual
      // Parcelas pendentes: recebem estorno na mesma fatura
      // Ambas as faturas ficam balanceadas (parcela + crédito/estorno = 0 ou valor reduzido)

      // Atualizar tags do registro pai
      const existingTags = originalExpense.tags || [];
      const newTags = [...existingTags, ...selectedInstallments.map(n => `refunded_installment_${n}`)];
      
      await tx.creditExpense.update({
        where: { id: originalExpense.id },
        data: { tags: newTags }
      });

      // Recalcular faturas afetadas
      for (const billId of Array.from(affectedBills)) {
        await recalculateBillTotal(tx, billId);
      }

      return {
        refundRecords,
        totalRefundAmount,
        affectedBillsCount: affectedBills.size,
      };
    });

    // Atualizar automaticamente o status das faturas que podem ter ficado com valor 0
    try {
      await triggerBillStatusUpdate(userId);
    } catch (error) {
      console.warn('Aviso: Erro ao atualizar status automático das faturas:', error);
    }

    return NextResponse.json({
      message: 'Estorno por parcelas processado com sucesso',
      data: {
        refundType: 'INSTALLMENT',
        selectedInstallments,
        totalRefundAmount,
        refundRecords: result.refundRecords,
        affectedBillsCount: result.affectedBillsCount,
      },
    });

  } catch (error) {
    console.error('Erro ao processar estorno por parcelas:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// POST - Processar estorno de compra
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { refundType, amount: rawAmount, selectedInstallments } = body;
    
    // Garantir que o amount seja tratado como número com 2 casas decimais (apenas para FULL e PARTIAL)
    const amount = rawAmount ? Number(parseFloat(rawAmount).toFixed(2)) : 0;

    // Validações básicas
    if (!refundType || !['FULL', 'PARTIAL', 'INSTALLMENT'].includes(refundType)) {
      return NextResponse.json({
        error: 'Tipo de estorno deve ser FULL, PARTIAL ou INSTALLMENT'
      }, { status: 400 });
    }

    if (refundType !== 'INSTALLMENT' && (!amount || amount <= 0)) {
      return NextResponse.json({
        error: 'Valor do estorno deve ser maior que zero'
      }, { status: 400 });
    }

    if (refundType === 'INSTALLMENT' && (!selectedInstallments || selectedInstallments.length === 0)) {
      return NextResponse.json({
        error: 'Selecione pelo menos uma parcela para estornar'
      }, { status: 400 });
    }

    // Buscar a compra original com todas as informações necessárias
    const originalExpense = await prisma.creditExpense.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        parentExpenseId: null, // Apenas registros pai podem ser estornados
      },
      include: {
        creditCard: true,
        childExpenses: {
          include: {
            creditBill: true,
          },
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
    });

    if (!originalExpense) {
      return NextResponse.json({ 
        error: 'Compra não encontrada ou não pode ser estornada' 
      }, { status: 404 });
    }

    // Verificar se já foi estornada
    const existingRefund = await prisma.creditExpense.findFirst({
      where: {
        tags: { has: `refund_of_${originalExpense.id}` },
        userId: user.id,
      }
    });

    if (existingRefund && refundType === 'FULL') {
      return NextResponse.json({ 
        error: 'Esta compra já foi estornada' 
      }, { status: 400 });
    }

    // Processar estorno por parcelas
    if (refundType === 'INSTALLMENT') {
      return await processInstallmentRefund(originalExpense, selectedInstallments, user.id);
    }

    // Processar estornos FULL e PARTIAL (lógica existente)
    // Usar funções utilitárias para validação
    const canDoFullRefund = originalExpense.childExpenses.every((child: any) => 
      !child.creditBill || child.creditBill.status !== 'PAID'
    );
    
    const maxRefundAmount = originalExpense.childExpenses
      .filter((child: any) => child.creditBill?.status !== 'PAID')
      .reduce((sum: number, child: any) => sum + Number(child.amount), 0);

    // Validações específicas por tipo de estorno
    if (refundType === 'FULL') {
      if (!canDoFullRefund) {
        return NextResponse.json({
          error: 'Não é possível fazer estorno completo. Algumas parcelas já foram pagas.'
        }, { status: 400 });
      }

      // Usar tolerância para comparação de valores decimais
      const originalAmount = Number(originalExpense.amount);
      const tolerance = 0.01; // 1 centavo de tolerância
      
      if (Math.abs(amount - originalAmount) > tolerance) {
        return NextResponse.json({
          error: `Para estorno completo, o valor deve ser igual ao valor total da compra (R$ ${originalAmount.toFixed(2)}). Valor recebido: R$ ${amount.toFixed(2)}`
        }, { status: 400 });
      }
    } else if (refundType === 'PARTIAL') {
      if (amount > maxRefundAmount) {
        return NextResponse.json({
          error: `Valor máximo para estorno: R$ ${maxRefundAmount.toFixed(2)}`
        }, { status: 400 });
      }
    }

    // Calcular quantas parcelas foram pagas (para estratégia de estorno)
    const paidInstallmentsCount = originalExpense.billItems.filter(
      (item: any) => item.bill?.status === 'PAID'
    ).length;

    // Primeiro, criar o estorno e associar às faturas (transação mais rápida)
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Criar registro de estorno
      const refundExpense = await tx.creditExpense.create({
        data: {
          description: `ESTORNO: ${originalExpense.description}`,
          amount: -Math.abs(amount), // Valor negativo para estorno
          purchaseDate: new Date(),
          installments: 1, // Estornos são sempre em uma parcela
          type: 'REFUND',
          categoryId: originalExpense.categoryId,
          creditCardId: originalExpense.creditCardId,
          userId: user.id,
          tags: [`refund_of_${originalExpense.id}`, `refund_${refundType.toLowerCase()}`],
        },
      });

      // 2. Calcular como aplicar o estorno usando função utilitária
      const refundDistribution = calculateRefundDistribution(
        originalExpense.creditCard,
        amount,
        paidInstallmentsCount,
        new Date()
      );

      // 3. Processar itens de estorno apenas se for estorno parcial
      const affectedBillIds = new Set<string>();
      
      // Para estorno parcial, criar itens de crédito nas faturas
      if (refundType === 'PARTIAL') {
        for (const installment of refundDistribution.installments) {
          const year = installment.dueDate.getFullYear();
          const month = installment.dueDate.getMonth();
          
          // Calcular as datas corretas da fatura
          const closingDate = calculateClosingDate(originalExpense.creditCard, year, month);
          const dueDate = calculateDueDate(originalExpense.creditCard, year, month);
          
          // Encontrar ou criar a fatura para este mês
          let bill = await tx.creditBill.findFirst({
            where: {
              creditCardId: originalExpense.creditCardId,
              closingDate: closingDate,
              userId: user.id,
            },
          });

          if (!bill) {
            bill = await tx.creditBill.create({
              data: {
                creditCardId: originalExpense.creditCardId,
                closingDate,
                dueDate,
                totalAmount: 0,
                status: 'PENDING',
                userId: user.id,
              },
            });
          }

          // Criar o item de estorno já associado à fatura
          await tx.creditBillItem.create({
            data: {
              creditExpenseId: refundExpense.id,
              installmentNumber: installment.installment,
              amount: installment.value,
              dueDate: installment.dueDate,
              billId: bill.id,
            },
          });

          affectedBillIds.add(bill.id);
        }
      }

      // 4. Se for estorno completo, cancelar parcelas pendentes
      if (refundType === 'FULL') {
        // Coletar IDs das faturas das parcelas que serão removidas
        const pendingItems = await tx.creditBillItem.findMany({
          where: {
            creditExpenseId: originalExpense.id,
            bill: {
              status: { in: ['PENDING', 'OVERDUE'] }
            }
          },
          include: {
            bill: true
          }
        });
        
        for (const item of pendingItems) {
          if (item.bill) {
            affectedBillIds.add(item.bill.id);
          }
        }

        // Remover parcelas pendentes da compra original
        await tx.creditBillItem.deleteMany({
          where: {
            creditExpenseId: originalExpense.id,
            bill: {
              status: { in: ['PENDING', 'OVERDUE'] }
            }
          }
        });

        // Marcar a compra original como estornada
        await tx.creditExpense.update({
          where: { id: originalExpense.id },
          data: {
            tags: [...originalExpense.tags, 'refunded_full']
          }
        });
      } else {
        // Para estorno parcial, apenas marcar como parcialmente estornado
        const existingTags = originalExpense.tags || [];
        const partialRefundTags = existingTags.filter((tag: string) => tag.startsWith('refunded_partial_'));
        const totalPartialRefunds = partialRefundTags.length;
        
        await tx.creditExpense.update({
          where: { id: originalExpense.id },
          data: {
            tags: [...existingTags, `refunded_partial_${totalPartialRefunds + 1}`]
          }
        });
      }

      return {
        refundExpense,
        originalExpense,
        refundType,
        refundAmount: amount,
        affectedBillIds: Array.from(affectedBillIds),
      };
    });

    // 5. Recalcular valores das faturas fora da transação principal
    for (const billId of result.affectedBillIds) {
      const { _sum } = await prisma.creditBillItem.aggregate({
        where: { billId: billId },
        _sum: { amount: true }
      });

      // Ajustar valores muito próximos de zero para zero exato
      let totalAmount = _sum.amount || 0;
      if (Math.abs(totalAmount) < 0.01) {
        totalAmount = 0;
      }

      await prisma.creditBill.update({
        where: { id: billId },
        data: { 
          totalAmount: totalAmount
        }
      });
    }

    // Atualizar automaticamente o status das faturas que podem ter ficado com valor 0
    try {
      await triggerBillStatusUpdate(user.id);
    } catch (error) {
      console.warn('Aviso: Erro ao atualizar status automático das faturas:', error);
    }

    return NextResponse.json({
      message: 'Estorno processado com sucesso',
      data: result,
    });

  } catch (error) {
    console.error('Erro ao processar estorno:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}