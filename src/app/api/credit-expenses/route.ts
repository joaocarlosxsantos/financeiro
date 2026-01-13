import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  calculateInstallmentDates, 
  getBillPeriodForInstallment,
  calculateClosingDate,
  calculateDueDate 
} from '@/lib/credit-utils';
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
      parentExpenseId: null, // Mostrar apenas registros PAI na tela de gastos
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
          creditBill: true,
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

    // Criar o registro PAI primeiro (sem transação)
    const parentExpense = await prisma.creditExpense.create({
      data: {
        description,
        amount: parseFloat(amount), // Valor TOTAL
        purchaseDate: new Date(purchaseDate),
        installments: installments,
        installmentNumber: 0, // 0 = registro pai
        parentExpenseId: null,
        type,
        categoryId: categoryId || null,
        creditCardId,
        creditBillId: null, // Pai não vai para fatura
        userId: user.id,
        tags,
      },
      include: {
        category: true,
        creditCard: true,
      },
    });

    // Criar registros FILHOS para cada parcela (sem transação)
    for (const installmentInfo of installmentDates) {
      // Determinar em qual fatura essa parcela deve entrar
      const billPeriod = getBillPeriodForInstallment(
        creditCard as any,
        installmentInfo.dueDate
      );
      
      const closingDate = calculateClosingDate(creditCard as any, billPeriod.year, billPeriod.month - 1);
      const dueDate = calculateDueDate(creditCard as any, billPeriod.year, billPeriod.month - 1);
      
      // Buscar ou criar a fatura
      let bill = await prisma.creditBill.findFirst({
        where: {
          creditCardId,
          closingDate,
          userId: user.id,
        },
      });

      if (!bill) {
        bill = await prisma.creditBill.create({
          data: {
            userId: user.id,
            creditCardId,
            closingDate,
            dueDate,
            totalAmount: installmentInfo.value,
            paidAmount: 0,
            status: 'PENDING',
          },
        });
      } else {
        // Atualizar total da fatura
        await prisma.creditBill.update({
          where: { id: bill.id },
          data: {
            totalAmount: { increment: installmentInfo.value },
          },
        });
      }

      // Criar o registro FILHO (parcela para a fatura)
      await prisma.creditExpense.create({
        data: {
          description: `${description} (${installmentInfo.installment}/${installmentInfo.totalInstallments})`,
          amount: installmentInfo.value,
          purchaseDate: new Date(purchaseDate),
          installments: installmentInfo.totalInstallments,
          installmentNumber: installmentInfo.installment,
          parentExpenseId: parentExpense.id,
          type,
          categoryId: categoryId || null,
          creditCardId,
          creditBillId: bill.id,
          userId: user.id,
          tags,
        },
      });
    }

    // ✨ Retornar o registro pai
    return NextResponse.json(parentExpense, { status: 201 });
  } catch (error: any) {
    console.error('❌ Erro ao criar gasto no cartão:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}