import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { countFixedOccurrences } from '@/lib/recurring-utils';

function parseCsvParam(v: string | null | undefined) {
  if (!v) return undefined;
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const { searchParams } = new URL(req.url);
  if (searchParams.get('dev') !== 'true') return NextResponse.json({ error: 'dev param required' }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const walletId = parseCsvParam(searchParams.get('walletId'));
  const year = Number(searchParams.get('year')) || undefined;
  const month = Number(searchParams.get('month')) || undefined;

  const walletFilter: any = {};
  if (walletId) {
    if (Array.isArray(walletId)) walletFilter.walletId = { in: walletId };
    else walletFilter.walletId = walletId;
  }

  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;
  if (year && month) {
    startDateObj = new Date(year, month - 1, 1);
    endDateObj = new Date(year, month, 0);
  }

  const whereBase = { user: { email: session.user.email }, ...walletFilter };

  // PUNCTUAL aggregates
  const [expVarAgg, incVarAgg] = await Promise.all([
    prisma.expense.aggregate({ where: { ...whereBase, type: 'PUNCTUAL', ...(startDateObj && endDateObj ? { date: { gte: startDateObj, lte: endDateObj } } : {}) }, _sum: { amount: true } }),
    prisma.income.aggregate({ where: { ...whereBase, type: 'PUNCTUAL', ...(startDateObj && endDateObj ? { date: { gte: startDateObj, lte: endDateObj } } : {}) }, _sum: { amount: true } }),
  ]);

  // fixed lists (include dayOfMonth)
  const fixedExpenses = await prisma.expense.findMany({ where: { ...whereBase, type: 'RECURRING' }, select: { id: true, amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });
  const fixedIncomes = await prisma.income.findMany({ where: { ...whereBase, type: 'RECURRING' }, select: { id: true, amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });

  let fixedExpensesSum = 0;
  let fixedIncomesSum = 0;
  if (startDateObj && endDateObj) {
    for (const fe of fixedExpenses) {
      const recStart = (fe.startDate ?? fe.date) as Date | null;
      const recEnd = (fe.endDate ?? null) as Date | null;
      const day = typeof (fe as any).dayOfMonth === 'number' ? (fe as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, startDateObj, endDateObj);
      if (occurs > 0) fixedExpensesSum += Number(fe.amount || 0) * occurs;
    }
    for (const fi of fixedIncomes) {
      const recStart = (fi.startDate ?? fi.date) as Date | null;
      const recEnd = (fi.endDate ?? null) as Date | null;
      const day = typeof (fi as any).dayOfMonth === 'number' ? (fi as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, startDateObj, endDateObj);
      if (occurs > 0) fixedIncomesSum += Number(fi.amount || 0) * occurs;
    }
  }

  return NextResponse.json({
    expVarSum: Number(expVarAgg._sum.amount || 0),
    incVarSum: Number(incVarAgg._sum.amount || 0),
    fixedExpensesCount: fixedExpenses.length,
    fixedIncomesCount: fixedIncomes.length,
    fixedExpensesSum,
    fixedIncomesSum,
  });
}
