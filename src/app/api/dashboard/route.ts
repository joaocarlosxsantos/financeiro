import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

function parseCsvParam(v: string | null | undefined) {
  if (!v) return undefined;
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const walletId = parseCsvParam(searchParams.get('walletId'));
  const paymentType = parseCsvParam(searchParams.get('paymentType'));

  // Exemplo: total de despesas, rendas e saldo
  const walletFilter: any = {};
  if (walletId) {
    if (Array.isArray(walletId)) walletFilter.walletId = { in: walletId };
    else walletFilter.walletId = walletId;
  }

  const paymentTypeFilter: any = {};
  if (paymentType) {
    if (Array.isArray(paymentType)) paymentTypeFilter.paymentType = { in: paymentType };
    else paymentTypeFilter.paymentType = paymentType;
  }

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { 
        user: { email: session.user.email }, 
        transferId: null, // Excluir transferências
        ...walletFilter, 
        ...paymentTypeFilter 
      },
      select: { amount: true },
    }),
    prisma.income.findMany({
      where: { 
        user: { email: session.user.email }, 
        transferId: null, // Excluir transferências
        ...walletFilter, 
        ...paymentTypeFilter 
      },
      select: { amount: true },
    }),
  ]);
  type ExpSel = Awaited<ReturnType<typeof prisma.expense.findMany>>[number];
  type IncSel = Awaited<ReturnType<typeof prisma.income.findMany>>[number];
  const totalExpenses = expenses.reduce((sum: number, e: ExpSel) => sum + Number(e.amount), 0);
  const totalIncomes = incomes.reduce((sum: number, i: IncSel) => sum + Number(i.amount), 0);
  const balance = totalIncomes - totalExpenses;

  return NextResponse.json({ totalExpenses, totalIncomes, balance });
}
