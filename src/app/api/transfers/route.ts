import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parseInputDateBrasilia } from '@/lib/datetime-brasilia';
import crypto from 'crypto';

const transferSchema = z.object({
  amount: z.string().transform((val) => parseFloat(val)),
  description: z.string().optional(),
  fromWalletId: z.string(),
  toWalletId: z.string(),
  date: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, description, fromWalletId, toWalletId, date } = transferSchema.parse(body);

    if (amount <= 0) {
      return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 });
    }

    if (fromWalletId === toWalletId) {
      return NextResponse.json({ error: 'Carteira de origem deve ser diferente da carteira de destino' }, { status: 400 });
    }

    // Verificar se ambas as carteiras pertencem ao usuário
    const wallets = await prisma.wallet.findMany({
      where: {
        id: { in: [fromWalletId, toWalletId] },
        userId: user.id,
      },
    });

    if (wallets.length !== 2) {
      return NextResponse.json({ error: 'Carteiras não encontradas ou não pertencem ao usuário' }, { status: 400 });
    }

    const fromWallet = wallets.find((w: any) => w.id === fromWalletId);
    const toWallet = wallets.find((w: any) => w.id === toWalletId);

    // Buscar categoria de transferência (deve existir)
    const transferCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: 'Transferência entre Contas',
        type: 'BOTH',
      },
    });

    if (!transferCategory) {
      return NextResponse.json({ error: 'Categoria de transferência não encontrada' }, { status: 500 });
    }

    // Gerar ID único para a transferência
    const transferId = crypto.randomUUID();

    // Data da transferência
    const transferDate = date ? parseInputDateBrasilia(date) : new Date();

    const descriptionText = description || `Transferência: ${fromWallet?.name} → ${toWallet?.name}`;

    // Transação para garantir atomicidade
    const result = await prisma.$transaction([
      // Criar despesa na carteira de origem
      prisma.expense.create({
        data: {
          description: descriptionText,
          amount: amount,
          date: transferDate,
          type: 'VARIABLE',
          paymentType: 'PIX_TRANSFER',
          transferId: transferId,
          categoryId: transferCategory.id,
          userId: user.id,
          walletId: fromWalletId,
          tags: ['transferencia'],
        },
      }),
      // Criar receita na carteira de destino
      prisma.income.create({
        data: {
          description: descriptionText,
          amount: amount,
          date: transferDate,
          type: 'VARIABLE',
          paymentType: 'PIX_TRANSFER',
          transferId: transferId,
          categoryId: transferCategory.id,
          userId: user.id,
          walletId: toWalletId,
          tags: ['transferencia'],
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Transferência realizada com sucesso',
      transferId: transferId,
      expense: result[0],
      income: result[1],
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao realizar transferência:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('perPage') || '50'), 200);
    const skip = (page - 1) * perPage;

    // Buscar transferências (despesas com transferId)
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        transferId: { not: null },
      },
      include: {
        wallet: true,
        category: true,
      },
      orderBy: { date: 'desc' },
      skip,
      take: perPage,
    });

    // Para cada despesa, buscar a receita correspondente
    const transfers = await Promise.all(
      expenses.map(async (expense: any) => {
        const income = await prisma.income.findFirst({
          where: {
            userId: user.id,
            transferId: expense.transferId,
          },
          include: {
            wallet: true,
          },
        });

        return {
          id: expense.transferId,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          fromWallet: expense.wallet,
          toWallet: income?.wallet,
          createdAt: expense.createdAt,
        };
      })
    );

    const total = await prisma.expense.count({
      where: {
        userId: user.id,
        transferId: { not: null },
      },
    });

    return NextResponse.json({
      transfers,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });

  } catch (error) {
    console.error('Erro ao buscar transferências:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}