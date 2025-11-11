import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API para buscar créditos/estornos de cartão de crédito
 * GET /api/credit-incomes
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const creditCardId = searchParams.get('creditCardId');

  try {
    const where: any = {
      userId: user.id,
    };

    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    if (creditCardId) {
      where.creditCardId = creditCardId;
    }

    const creditIncomes = await prisma.creditIncome.findMany({
      where,
      include: {
        category: true,
        creditCard: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(creditIncomes);
  } catch (error: any) {
    console.error('Erro ao buscar créditos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar créditos', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * API para criar um crédito/estorno de cartão de crédito
 * POST /api/credit-incomes
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  }

  try {
    const { description, amount, date, categoryId, creditCardId, tags } = await req.json();

    // Validações
    if (!description || !amount || !date || !creditCardId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Verificar se o cartão pertence ao usuário
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId: user.id,
      },
    });

    if (!creditCard) {
      return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
    }

    // Criar o crédito
    const creditIncome = await prisma.creditIncome.create({
      data: {
        description,
        amount,
        date: new Date(date),
        categoryId: categoryId || null,
        userId: user.id,
        creditCardId,
        tags: tags || [],
      },
      include: {
        category: true,
        creditCard: true,
      },
    });
    // O crédito disponível é calculado dinamicamente, não precisa atualizar

    return NextResponse.json(creditIncome, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar crédito:', error);
    return NextResponse.json(
      { error: 'Erro ao criar crédito', details: error.message },
      { status: 500 }
    );
  }
}
