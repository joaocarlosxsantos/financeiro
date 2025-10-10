import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  calculateClosingDate, 
  calculateDueDate, 
  calculateBillStatus,
  getBillPeriodForInstallment 
} from '@/lib/credit-utils';

// GET - Listar faturas
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
    const status = url.searchParams.get('status');
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');
    const skip = (page - 1) * perPage;

    const where: any = {
      userId: user.id,
    };

    if (creditCardId) {
      where.creditCardId = creditCardId;
    }

    if (status) {
      where.status = status;
    }

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month), 1);
      const endDate = new Date(parseInt(year), parseInt(month) + 1, 0);
      where.closingDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [bills, total] = await Promise.all([
      prisma.creditBill.findMany({
        where,
        include: {
          creditCard: true,
          items: {
            include: {
              creditExpense: {
                include: {
                  category: true,
                },
              },
            },
            orderBy: {
              dueDate: 'asc',
            },
          },
          payments: {
            include: {
              wallet: true,
            },
            orderBy: {
              paymentDate: 'desc',
            },
          },
        },
        orderBy: {
          dueDate: 'desc',
        },
        skip,
        take: perPage,
      }),
      prisma.creditBill.count({ where }),
    ]);

    // Atualizar status das faturas baseado na data atual
    const currentDate = new Date();
    const updatedBills = bills.map((bill: any) => ({
      ...bill,
      status: calculateBillStatus(
        Number(bill.totalAmount),
        Number(bill.paidAmount),
        bill.dueDate,
        currentDate
      ),
    }));

    return NextResponse.json({
      data: updatedBills,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar faturas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Fechar faturas (gerar faturas para cartões)
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
    const { creditCardId, year, month } = body;

    if (!creditCardId || year === undefined || month === undefined) {
      return NextResponse.json({
        error: 'Campos obrigatórios: creditCardId, year, month'
      }, { status: 400 });
    }

    // Buscar cartão de crédito
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId: user.id,
      },
    });

    if (!creditCard) {
      return NextResponse.json({ error: 'Cartão de crédito não encontrado' }, { status: 404 });
    }

    // Calcular datas da fatura
    const closingDate = calculateClosingDate(creditCard, year, month);
    const dueDate = calculateDueDate(creditCard, year, month);

    // Verificar se já existe fatura para este período
    const existingBill = await prisma.creditBill.findFirst({
      where: {
        creditCardId,
        closingDate,
      },
    });

    if (existingBill) {
      return NextResponse.json({
        error: 'Já existe uma fatura para este período'
      }, { status: 400 });
    }

    // Buscar itens que devem entrar nesta fatura
    const billItems = await prisma.creditBillItem.findMany({
      where: {
        billId: null, // Ainda não associados a uma fatura
        creditExpense: {
          creditCardId,
        },
        dueDate: {
          gte: new Date(year, month, 1),
          lte: new Date(year, month + 1, 0),
        },
      },
      include: {
        creditExpense: true,
      },
    });

    if (billItems.length === 0) {
      return NextResponse.json({
        error: 'Nenhum item encontrado para esta fatura'
      }, { status: 400 });
    }

    // Calcular valor total
    const totalAmount = billItems.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

    // Criar fatura em transação
    const result = await prisma.$transaction(async (tx: any) => {
      // Criar a fatura
      const bill = await tx.creditBill.create({
        data: {
          creditCardId,
          closingDate,
          dueDate,
          totalAmount,
          paidAmount: 0,
          status: 'PENDING',
          userId: user.id,
        },
        include: {
          creditCard: true,
        },
      });

      // Associar os itens à fatura
      await tx.creditBillItem.updateMany({
        where: {
          id: {
            in: billItems.map((item: any) => item.id),
          },
        },
        data: {
          billId: bill.id,
        },
      });

      return bill;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar fatura:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}