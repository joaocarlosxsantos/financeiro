import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstallmentDates, createBillsForInstallments } from '@/lib/credit-utils';
// GET - Listar gastos no cartão de crédito
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const creditCardId = url.searchParams.get('creditCardId');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const type = url.searchParams.get('type') as 'EXPENSE' | 'REFUND' | null;
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '50');
    const skip = (page - 1) * perPage;

    const where: any = {
      userId: user.id,
    };

    if (creditCardId) {
      where.creditCardId = creditCardId;
    }

    if (type) {
      where.type = type;
    }

    if (start && end) {
      where.purchaseDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    const [creditExpenses, total] = await Promise.all([
      prisma.creditExpense.findMany({
        where,
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
        orderBy: {
          purchaseDate: 'desc',
        },
        skip,
        take: perPage,
      }),
      prisma.creditExpense.count({ where }),
    ]);

    // Buscar dados das tags separadamente
    const expensesWithTags = await Promise.all(
      creditExpenses.map(async (expense: any) => {
        if (expense.tags && expense.tags.length > 0) {
          const tagDetails = await prisma.tag.findMany({
            where: {
              id: { in: expense.tags },
              userId: user.id,
            },
            select: {
              id: true,
              name: true,
            },
          });
          return { ...expense, tags: tagDetails };
        }
        return { ...expense, tags: [] };
      })
    );

    return NextResponse.json({
      data: expensesWithTags,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar gastos no cartão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar novo gasto no cartão de crédito
export async function POST(request: NextRequest) {
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

    // Calcular as parcelas
    const installmentDates = calculateInstallmentDates(
      creditCard,
      new Date(purchaseDate),
      installments,
      parseFloat(amount)
    );

    // Iniciar transação
    const result = await prisma.$transaction(async (tx: any) => {
      // Criar o gasto principal
      const creditExpense = await tx.creditExpense.create({
        data: {
          description,
          amount: parseFloat(amount),
          purchaseDate: new Date(purchaseDate),
          installments,
          type,
          categoryId: categoryId || null,
          creditCardId,
          userId: user.id,
          tags,
        },
        include: {
          category: true,
          creditCard: true,
        },
      });

      // Criar os itens da fatura (parcelas)
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

    // ✨ APÓS criar o gasto, gerar automaticamente as faturas necessárias
    try {
      await createBillsForInstallments(
        prisma,
        creditCard,
        installmentDates,
        user.id
      );
      console.log('✅ Faturas criadas automaticamente para o gasto:', result.id);
    } catch (billError) {
      console.error('⚠️ Erro ao criar faturas automaticamente:', billError);
      // Não falhar a requisição, apenas logar o erro
    }

    console.log('✅ Gasto de cartão criado com sucesso:', result.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('❌ Erro ao criar gasto no cartão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}