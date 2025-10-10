import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserByApiKeyFromHeader } from '@/lib/apikey';

async function findUserFromSessionOrApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const userByKey = await getUserByApiKeyFromHeader(authHeader);
    if (userByKey) return userByKey;
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw { status: 401, message: 'Unauthorized' };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

// Copy of expansion logic used by /api/credit-cards so usage is computed the same way
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

function normalizeAmount(n: number) {
  // Round to 2 decimal places and ensure a Number (not string)
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

export async function GET(req: NextRequest) {
  try {
    const user = await findUserFromSessionOrApiKey(req);

    // Fetch credit cards with incomes and expenses so we can expand FIXED items
    const creditCards = await prisma.creditCard.findMany({
      where: { userId: user.id },
      include: { 
        incomes: {
          where: {
            paymentType: 'CREDIT'
          }
        }, 
        expenses: {
          where: {
            paymentType: 'CREDIT'
          }
        }, 
        bank: true 
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    // Incluir transações até o final do dia seguinte para cobrir diferenças de fuso horário
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const payload = creditCards.map((card: any) => {
      // Expandir gastos e ganhos fixos
      const expensesExpanded = expandFixedRecords(card.expenses || [], tomorrow);
      const incomesExpanded = expandFixedRecords(card.incomes || [], tomorrow);
      
      const totalExpenses = expensesExpanded.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const totalIncomes = incomesExpanded.reduce((sum, income) => sum + Number(income.amount || 0), 0);
      
      // Lógica corrigida do cálculo do limite:
      // - Gastos (expenses) AUMENTAM o valor utilizado
      // - Ganhos (incomes) DIMINUEM o valor utilizado (estornos/cashback)
      // - Valor utilizado = Gastos - Ganhos (mas nunca negativo)
      // - Limite disponível = Limite total - Valor utilizado
      const rawUsedAmount = normalizeAmount(totalExpenses - totalIncomes);
      const usedAmount = Math.max(0, rawUsedAmount); // Nunca negativo
      const limit = normalizeAmount(Number(card.limit));
      const calculatedAvailableLimit = normalizeAmount(limit - usedAmount);
      // Garantir que o limite disponível não ultrapasse o limite total do cartão  
      const availableLimit = Math.min(calculatedAvailableLimit, limit);
      const usagePercentage = limit > 0 ? normalizeAmount((usedAmount / limit) * 100) : 0;
      
      return {
        id: card.id,
        name: card.name,
        bank: card.bank ? card.bank.name : null,
        limit: limit,
        limitFormatted: formatCurrency(limit),
        usedAmount: usedAmount,
        usedAmountFormatted: formatCurrency(usedAmount),
        availableLimit: availableLimit,
        availableLimitFormatted: formatCurrency(availableLimit),
        usagePercentage: Math.max(0, Math.min(100, usagePercentage)),
        closingDay: card.closingDay,
        dueDay: card.dueDay
      };
    })
    .filter((card: any) => card.usedAmount > 0); // Filtrar cartões sem uso

    // Sort credit cards by usage percentage descending (maior uso primeiro)
    payload.sort((a: any, b: any) => (b.usagePercentage ?? 0) - (a.usagePercentage ?? 0));

    // Return named property so clients (like Shortcuts) can reference the array by name
    return NextResponse.json({ creditCards: payload });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}