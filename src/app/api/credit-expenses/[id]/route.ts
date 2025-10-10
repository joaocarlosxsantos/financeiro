import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstallmentDates } from '@/lib/credit-utils';

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
        billItems: {
          include: {
            bill: true,
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
        billItems: {
          include: {
            bill: true,
          },
        },
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
    }

    // Verificar se alguma parcela já está em fatura fechada
    const hasClosedBills = existingExpense.billItems.some(
      (item: any) => item.bill && item.bill.status !== 'PENDING'
    );

    if (hasClosedBills) {
      return NextResponse.json({
        error: 'Não é possível editar gastos com parcelas em faturas já fechadas'
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

    // Calcular as novas parcelas
    const installmentDates = calculateInstallmentDates(
      creditCard,
      new Date(purchaseDate),
      installments,
      parseFloat(amount)
    );

    // Iniciar transação
    const result = await prisma.$transaction(async (tx: any) => {
      // Deletar itens de fatura existentes
      await tx.creditBillItem.deleteMany({
        where: {
          creditExpenseId: params.id,
        },
      });

      // Atualizar o gasto principal
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
        },
      });

      // Criar os novos itens da fatura (parcelas)
      const billItems = await Promise.all(
        installmentDates.map((installment) =>
          tx.creditBillItem.create({
            data: {
              creditExpenseId: creditExpense.id,
              installmentNumber: installment.installmentNumber,
              amount: installment.amount,
              dueDate: installment.dueDate,
            },
          })
        )
      );

      return {
        ...creditExpense,
        billItems,
      };
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
        billItems: {
          include: {
            bill: true,
          },
        },
      },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
    }

    // Verificar se alguma parcela já está em fatura fechada
    const hasClosedBills = existingExpense.billItems.some(
      (item: any) => item.bill && item.bill.status !== 'PENDING'
    );

    if (hasClosedBills) {
      return NextResponse.json({
        error: 'Não é possível excluir gastos com parcelas em faturas já fechadas'
      }, { status: 400 });
    }

    // Deletar o gasto (cascade vai deletar os billItems)
    await prisma.creditExpense.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Gasto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir gasto:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}