import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { 
  calculateClosingDate, 
  calculateDueDate, 
  calculateBillStatus,
  getBillPeriodForInstallment 
} from '@/lib/credit-utils';

// Schema de validação para query parameters
const CreditBillsQuerySchema = z.object({
  creditCardId: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  year: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  month: z.coerce.number().int().min(1).max(12).nullable().optional(),
  page: z.coerce.number().int().min(1).nullable().optional(),
  perPage: z.coerce.number().int().min(1).max(200).nullable().optional(),
});

// GET - Listar faturas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      logger.warn('Tentativa de acesso não autenticado em /api/credit-bills');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      logger.warn('Usuário não encontrado durante acesso a /api/credit-bills', { email: session.user.email });
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const url = new URL(request.url);
    
    // Validar query parameters com Zod
    const queryParams = {
      creditCardId: url.searchParams.get('creditCardId'),
      status: url.searchParams.get('status'),
      year: url.searchParams.get('year'),
      month: url.searchParams.get('month'),
      page: url.searchParams.get('page'),
      perPage: url.searchParams.get('perPage'),
    };

    logger.info('Query params recebidos em /api/credit-bills:', queryParams);

    const validationResult = CreditBillsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.flatten().fieldErrors;
      console.error('❌ Validação falhou em /api/credit-bills');
      console.error('Query params recebidos:', queryParams);
      console.error('Erros de validação:', errorDetails);
      
      logger.validationError('Validação falhou em /api/credit-bills', errorDetails, {
        userId: user.id,
        receivedParams: queryParams,
      });
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: errorDetails, received: queryParams },
        { status: 400 },
      );
    }

    const { creditCardId, status, year, month, page, perPage } = validationResult.data;
    const pageNum = page ?? 1;
    const perPageNum = perPage ?? 20;
    const skip = (pageNum - 1) * perPageNum;

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
      const yearNum = typeof year === 'number' ? year : parseInt(year as any);
      const monthNum = typeof month === 'number' ? month : parseInt(month as any);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      where.closingDate = {
        gte: startDate,
        lte: endDate,
      };
    }
    
    logger.apiRequest('GET', '/api/credit-bills', user.email, { filters: { creditCardId, status, year, month } });

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
        take: perPageNum,
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
        page: pageNum,
        perPage: perPageNum,
        total,
        totalPages: Math.ceil(total / perPageNum),
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