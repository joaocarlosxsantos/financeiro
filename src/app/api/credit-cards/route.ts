import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
      expenses: {
        where: {
          paymentType: 'CREDIT'
        }
      },
      incomes: {
        where: {
          paymentType: 'CREDIT'
        }
      },
      bank: true,
    },
    orderBy: { name: 'asc' }
  });

  // Calcular o valor utilizado de cada cartão
  const now = new Date();
  // Incluir transações até o final do dia seguinte para cobrir diferenças de fuso horário
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  
  function expandFixedRecords(records: any[], upto: Date) {
    const expanded: any[] = [];
    for (const r of records) {
      if (r.isFixed) {
        const recStart = r.startDate ? new Date(r.startDate) : r.date ? new Date(r.date) : new Date(1900, 0, 1);
        const recEnd = r.endDate ? new Date(r.endDate) : upto;
        const from = recStart;
        const to = recEnd < upto ? recEnd : upto;
        if (from.getTime() <= to.getTime()) {
          const day = typeof r.dayOfMonth === 'number' && r.dayOfMonth > 0 ? r.dayOfMonth : (r.date ? new Date(r.date).getDate() : 1);
          let cur = new Date(from.getFullYear(), from.getMonth(), 1);
          const last = new Date(to.getFullYear(), to.getMonth(), 1);
          while (cur.getTime() <= last.getTime()) {
            const lastDayOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
            const dayInMonth = Math.min(day, lastDayOfMonth);
            const occDate = new Date(cur.getFullYear(), cur.getMonth(), dayInMonth);
            if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
              expanded.push({ ...r, date: occDate.toISOString() });
            }
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          }
        }
      } else {
        if (r.date && new Date(r.date) <= upto) expanded.push(r);
      }
    }
    return expanded;
  }

  const creditCardsWithUsage = creditCards.map((card: any) => {
    // Expandir gastos e ganhos fixos
    const expensesExpanded = expandFixedRecords(card.expenses || [], tomorrow);
    const incomesExpanded = expandFixedRecords(card.incomes || [], tomorrow);
    
    const totalExpenses = expensesExpanded.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const totalIncomes = incomesExpanded.reduce((sum, income) => sum + Number(income.amount), 0);
    
    // Lógica corrigida do cálculo do limite:
    // - Gastos (expenses) AUMENTAM o valor utilizado
    // - Ganhos (incomes) DIMINUEM o valor utilizado (estornos/cashback)
    // - Valor utilizado = Gastos - Ganhos (mas nunca negativo)
    // - Limite disponível = Limite total - Valor utilizado
    const rawUsedAmount = totalExpenses - totalIncomes;
    const usedAmount = Math.max(0, rawUsedAmount); // Nunca negativo
    const calculatedAvailableLimit = Number(card.limit) - usedAmount;
    // Garantir que o limite disponível não ultrapasse o limite total do cartão
    const availableLimit = Math.min(calculatedAvailableLimit, Number(card.limit));
    const usagePercentage = Number(card.limit) > 0 ? (usedAmount / Number(card.limit)) * 100 : 0;
    
    return {
      ...card,
      usedAmount,
      availableLimit,
      usagePercentage: Math.max(0, Math.min(100, usagePercentage)),
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