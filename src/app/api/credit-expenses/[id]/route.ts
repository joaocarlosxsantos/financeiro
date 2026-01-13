import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstallmentDates, getBillPeriodForInstallment, calculateClosingDate, calculateDueDate } from '@/lib/credit-utils';
import { recalculateBillTotal } from '@/lib/credit-bill-utils';

// GET - Buscar gasto específico
export async function GET(
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

    const creditExpense = await prisma.creditExpense.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        category: true,
        creditCard: true,
        creditBill: true,
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

    if (!creditExpense) {
      return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
    }

    // Buscar tags se existirem IDs de tags
    let tagsData = [];
    if (creditExpense.tags && creditExpense.tags.length > 0) {
      tagsData = await prisma.tag.findMany({
        where: {
          id: { in: creditExpense.tags },
          userId: user.id,
        },
        select: {
          id: true,
          name: true,
        },
      });
    }

    const result = {
      ...creditExpense,
      tags: tagsData,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar gasto:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar gasto
export async function PUT(
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
    const {
      description,
      amount,
      purchaseDate,
      installments = 1,
      type = 'EXPENSE',
      categoryId,
      creditCardId,
      tags = [],
    } = body;

    // Buscar o gasto existente
    const existingExpense = await prisma.creditExpense.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        creditBill: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
    }

    // Verificar se está em fatura fechada
    if (existingExpense.creditBill && existingExpense.creditBill.status !== 'PENDING') {
      return NextResponse.json({
        error: 'Não é possível editar gastos em faturas já fechadas'
      }, { status: 400 });
    }

    // Validações
    if (!description || !amount || !purchaseDate || !creditCardId) {
      return NextResponse.json({
        error: 'Campos obrigatórios: description, amount, purchaseDate, creditCardId'
      }, { status: 400 });
    }

    if (installments < 1 || installments > 12) {
      return NextResponse.json({
        error: 'Número de parcelas deve estar entre 1 e 12'
      }, { status: 400 });
    }

    // Buscar dados do cartão de crédito
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId: user.id,
      },
    });

    if (!creditCard) {
      return NextResponse.json({ error: 'Cartão de crédito não encontrado' }, { status: 404 });
    }

    // Iniciar transação
    const result = await prisma.$transaction(async (tx: any) => {
      const oldBillId = existingExpense.creditBillId;

      // Atualizar o gasto
      const creditExpense = await tx.creditExpense.update({
        where: { id: params.id },
        data: {
          description,
          amount: parseFloat(amount),
          purchaseDate: new Date(purchaseDate),
          installments,
          type,
          categoryId: categoryId || null,
          creditCardId,
          tags,
        },
        include: {
          category: true,
          creditCard: true,
          creditBill: true,
        },
      });

      // Recalcular fatura antiga se existir
      if (oldBillId) {
        await recalculateBillTotal(tx, oldBillId);
      }

      // Recalcular fatura nova se for diferente
      if (creditExpense.creditBillId && creditExpense.creditBillId !== oldBillId) {
        await recalculateBillTotal(tx, creditExpense.creditBillId);
      }

      return creditExpense;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao atualizar gasto:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Deletar gasto
export async function DELETE(
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

    // Buscar o gasto existente
    const existingExpense = await prisma.creditExpense.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        creditBill: true,
        // Incluir registros filhos se for um pai
        childExpenses: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
    }

    // Verificar se está em fatura fechada
    if (existingExpense.creditBill && existingExpense.creditBill.status !== 'PENDING') {
      return NextResponse.json({
        error: 'Não é possível excluir gastos em faturas já fechadas'
      }, { status: 400 });
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx: any) => {
      const affectedBills = new Set<string>();
      
      // Se for um registro PAI (parentExpenseId: null), deletar também todos os filhos
      if (existingExpense.parentExpenseId === null) {
        // Buscar todos os registros filhos
        const childExpenses = await tx.creditExpense.findMany({
          where: { parentExpenseId: existingExpense.id },
          select: { id: true, creditBillId: true },
        });
        
        // Adicionar faturas afetadas pelos filhos
        childExpenses.forEach((child: { id: string; creditBillId: string | null }) => {
          if (child.creditBillId) {
            affectedBills.add(child.creditBillId);
          }
        });
        
        // Deletar todos os filhos
        if (childExpenses.length > 0) {
          await tx.creditExpense.deleteMany({
            where: { parentExpenseId: existingExpense.id },
          });
        }
      }
      
      // Adicionar fatura do registro atual (se tiver)
      if (existingExpense.creditBillId) {
        affectedBills.add(existingExpense.creditBillId);
      }

      // Deletar o gasto principal
      await tx.creditExpense.delete({
        where: { id: params.id },
      });

      // Recalcular totais de todas as faturas afetadas
      for (const billId of Array.from(affectedBills)) {
        await recalculateBillTotal(tx, billId);
      }

      return { affectedBills: affectedBills.size };
    });

    return NextResponse.json({ 
      message: 'Gasto excluído com sucesso',
      affectedBills: result.affectedBills
    });
  } catch (error) {
    console.error('Erro ao excluir gasto:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}