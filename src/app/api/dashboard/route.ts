import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const walletId = searchParams.get('walletId') || undefined;

  // Exemplo: total de despesas, rendas e saldo
  const walletFilter = walletId
    ? walletId.includes(',')
      ? { walletId: { in: walletId.split(',').map((s) => s.trim()).filter(Boolean) } }
      : { walletId }
    : {};

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { user: { email: session.user.email }, ...walletFilter },
      select: { amount: true },
    }),
    prisma.income.findMany({
      where: { user: { email: session.user.email }, ...walletFilter },
      select: { amount: true },
    }),
  ]);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncomes = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const balance = totalIncomes - totalExpenses;

  return NextResponse.json({ totalExpenses, totalIncomes, balance });
}
