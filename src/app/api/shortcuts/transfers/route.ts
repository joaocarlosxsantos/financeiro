import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserByApiKeyFromHeader } from '@/lib/apikey';
import { z } from 'zod';

function parseFlexibleDate(input: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [d, m, y] = input.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  const dt = new Date(input);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

async function findUserFromSessionOrApiKey(req: NextRequest) {
  // Try API Key first
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const userByKey = await getUserByApiKeyFromHeader(authHeader);
    if (userByKey) return userByKey;
  }
  // Fallback to NextAuth session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw { status: 401, message: 'Unauthorized' };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

// GET: Listar transferências
export async function GET(req: NextRequest) {
  try {
    const user = await findUserFromSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('perPage') || '50', 10), 200);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Filtros de data
    const dateFilter: any = {};
    if (start) {
      const startDate = parseFlexibleDate(start);
      dateFilter.gte = startDate;
    }
    if (end) {
      const endDate = parseFlexibleDate(end);
      dateFilter.lte = endDate;
    }

    const where: any = {
      userId: user.id,
      transferId: { not: null },
    };

    if (Object.keys(dateFilter).length > 0) {
      where.date = dateFilter;
    }

    // Buscar despesas (saída) que são transferências
    const totalExpenses = await prisma.expense.count({ where });

    const expenses = await prisma.expense.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { date: 'desc' },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    // Buscar as receitas (entrada) correspondentes
    const transferIds = expenses
      .map((e: any) => e.transferId)
      .filter((id: any): id is string => !!id);

    const incomes = await prisma.income.findMany({
      where: {
        transferId: { in: transferIds },
        userId: user.id,
      },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    // Mapear receitas por transferId
    const incomeMap = new Map(incomes.map((inc: any) => [inc.transferId, inc]));

    // Montar os objetos de transferência
    const transfers = expenses.map((expense: any) => {
      const income: any = incomeMap.get(expense.transferId!);
      return {
        transferId: expense.transferId,
        date: expense.date,
        amount: expense.amount,
        description: expense.description,
        fromWallet: expense.wallet,
        toWallet: income?.wallet || null,
        expense: {
          id: expense.id,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          walletId: expense.walletId,
          categoryId: expense.categoryId,
          category: expense.category,
        },
        income: income
          ? {
              id: income.id,
              amount: income.amount,
              description: income.description,
              date: income.date,
              walletId: income.walletId,
              categoryId: income.categoryId,
              category: income.category,
            }
          : null,
      };
    });

    return NextResponse.json({
      transfers,
      pagination: {
        page,
        perPage,
        total: totalExpenses,
        totalPages: Math.ceil(totalExpenses / perPage),
      },
    });
  } catch (error: any) {
    console.error('Erro ao listar transferências:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// POST: Criar transferência
export async function POST(req: NextRequest) {
  try {
    const user = await findUserFromSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const schema = z.object({
      amount: z.number().positive('Valor deve ser positivo'),
      description: z.string().min(1, 'Descrição é obrigatória'),
      fromWalletId: z.string().min(1, 'Carteira de origem é obrigatória'),
      toWalletId: z.string().min(1, 'Carteira de destino é obrigatória'),
      date: z.string().min(1, 'Data é obrigatória'),
    });

    const body = await req.json();
    const parse = schema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parse.error.errors },
        { status: 400 }
      );
    }

    const { amount, description, fromWalletId, toWalletId, date } = parse.data;

    // Validar se as carteiras são diferentes
    if (fromWalletId === toWalletId) {
      return NextResponse.json(
        { error: 'As carteiras de origem e destino devem ser diferentes' },
        { status: 400 }
      );
    }

    // Verificar se as carteiras pertencem ao usuário
    const [fromWallet, toWallet] = await Promise.all([
      prisma.wallet.findFirst({
        where: { id: fromWalletId, userId: user.id },
      }),
      prisma.wallet.findFirst({
        where: { id: toWalletId, userId: user.id },
      }),
    ]);

    if (!fromWallet) {
      return NextResponse.json({ error: 'Carteira de origem não encontrada' }, { status: 404 });
    }

    if (!toWallet) {
      return NextResponse.json({ error: 'Carteira de destino não encontrada' }, { status: 404 });
    }

    const transferDate = parseFlexibleDate(date);

    // Buscar categoria de transferência
    const transferCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: 'Transferência entre Contas',
        type: 'BOTH',
      },
    });

    if (!transferCategory) {
      return NextResponse.json(
        { error: 'Categoria de transferência não encontrada' },
        { status: 404 }
      );
    }

    // Criar transferência (despesa + receita) em uma transação
    const result = await prisma.$transaction(async (tx: any) => {
      // Gerar ID único para a transferência
      const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Criar despesa (saída)
      const expense = await tx.expense.create({
        data: {
          description,
          amount,
          date: transferDate,
          walletId: fromWalletId,
          categoryId: transferCategory.id,
          userId: user.id,
          transferId,
          tags: [],
        },
      });

      // Criar receita (entrada)
      const income = await tx.income.create({
        data: {
          description,
          amount,
          date: transferDate,
          walletId: toWalletId,
          categoryId: transferCategory.id,
          userId: user.id,
          transferId,
          tags: [],
        },
      });

      return { transferId, expense, income };
    });

    return NextResponse.json(
      {
        transferId: result.transferId,
        expense: result.expense,
        income: result.income,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao criar transferência:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
