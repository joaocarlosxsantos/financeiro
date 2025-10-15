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

// Copy of expansion logic used by /api/wallets so balances are computed the same way
function expandFixedRecords(records: any[], upto: Date) {
  const expanded: any[] = [];
  for (const r of records) {
    if (r.isRecurring) {
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await findUserFromSessionOrApiKey(req);
    const walletId = params.id;

    if (!walletId) {
      return NextResponse.json({ error: 'ID da carteira é obrigatório' }, { status: 400 });
    }

    // Fetch specific wallet with incomes and expenses so we can expand FIXED items
    const wallet = await prisma.wallet.findFirst({
      where: { 
        id: walletId,
        userId: user.id 
      },
      include: { incomes: true, expenses: true },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 });
    }

    const today = new Date();

    let balance: number;
    
    // If backend provided a precomputed numeric balance, prefer it
    if (typeof wallet.balance === 'number') {
      balance = normalizeAmount(Number(wallet.balance));
    } else {
      const incomesExpanded = expandFixedRecords(wallet.incomes || [], today);
      const expensesExpanded = expandFixedRecords(wallet.expenses || [], today);
      const totalIncomes = incomesExpanded.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      const totalExpenses = expensesExpanded.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      balance = normalizeAmount(totalIncomes - totalExpenses);
    }
    
    const response = {
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      balance: balance,
      balanceFormatted: formatCurrency(balance)
    };

    return NextResponse.json(response);
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}