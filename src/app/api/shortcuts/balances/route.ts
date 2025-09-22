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

export async function GET(req: NextRequest) {
  try {
    const user = await findUserFromSessionOrApiKey(req);

    // Aggregate incomes and expenses sums grouped by walletId for this user
    const incomeSums = await prisma.income.groupBy({
      by: ['walletId'],
      where: { userId: user.id },
      _sum: { amount: true },
    });

    const expenseSums = await prisma.expense.groupBy({
      by: ['walletId'],
      where: { userId: user.id },
      _sum: { amount: true },
    });

  // Fetch wallets basic info
  type WalletRow = { id: string; name: string; type: string };
  const wallets: WalletRow[] = await prisma.wallet.findMany({ where: { userId: user.id }, select: { id: true, name: true, type: true }, orderBy: { name: 'asc' } });

  const incomeMap = new Map<string, number>();
    for (const i of incomeSums) incomeMap.set(i.walletId ?? '', Number(i._sum.amount ?? 0));
    const expenseMap = new Map<string, number>();
    for (const e of expenseSums) expenseMap.set(e.walletId ?? '', Number(e._sum.amount ?? 0));

    const payload = wallets.map((w) => {
      const income = incomeMap.get(w.id) ?? 0;
      const expense = expenseMap.get(w.id) ?? 0;
      const balance = income - expense;
      return { id: w.id, name: w.name, type: w.type, balance };
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}
