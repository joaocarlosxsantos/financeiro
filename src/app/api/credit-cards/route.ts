import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateCreditCardUsage } from '@/lib/credit-utils';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const creditCards = await prisma.creditCard.findMany({
    where: { userId: user.id },
    include: {
      creditExpenses: {
        include: {
          childExpenses: true
        }
      },
      creditIncomes: true,
      creditBills: true,
      bank: true,
    },
    orderBy: { name: 'asc' }
  });

  // Calcular o valor utilizado de cada cartão
  // Usa a mesma função (calculateCreditCardUsage) usada por /api/credit-cards/[id] e
  // /api/shortcuts/credit-cards, para evitar que as três rotas divirjam de novo.
  // IMPORTANTE: o valor pago em faturas (CreditBill.paidAmount) também libera limite,
  // não apenas CreditIncome — antes o limite nunca voltava após pagar a fatura.
  const creditCardsWithUsage = creditCards.map((card: any) => {
    const { usedAmount, availableLimit, usagePercentage } = calculateCreditCardUsage({
      limit: Number(card.limit),
      creditExpenses: card.creditExpenses || [],
      creditIncomes: card.creditIncomes || [],
      creditBills: card.creditBills || [],
    });

    return {
      ...card,
      usedAmount,
      availableLimit,
      usagePercentage,
    };
  });

  const headers = new Headers();
  headers.set('Cache-Control', 'private, max-age=0, no-cache, no-store');
  return NextResponse.json(creditCardsWithUsage, { headers });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const body = await req.json();
  
  const creditCardSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    limit: z.number().min(0, 'Limite deve ser maior ou igual a zero'),
    closingDay: z.number().min(1, 'Dia de fechamento deve estar entre 1 e 31').max(31, 'Dia de fechamento deve estar entre 1 e 31'),
    dueDay: z.number().min(1, 'Dia de vencimento deve estar entre 1 e 31').max(31, 'Dia de vencimento deve estar entre 1 e 31'),
    bankId: z.string().optional(),
  });

  const parse = creditCardSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ 
      error: parse.error.issues.map(e => e.message).join(', ') 
    }, { status: 400 });
  }

  const { name, limit, closingDay, dueDay, bankId } = parse.data;

  try {
    const creditCard = await prisma.creditCard.create({
      data: { 
        name, 
        limit, 
        closingDay, 
        dueDay, 
        bankId: bankId || null, 
        userId: user.id 
      },
    });

    return NextResponse.json(creditCard, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Já existe um cartão com este nome' 
      }, { status: 400 });
    }
    
    console.error('Erro ao criar cartão:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}