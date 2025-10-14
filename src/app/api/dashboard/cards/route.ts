import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

function parseCsvParam(v: string | null | undefined) {
  if (!v) return undefined;
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const walletId = parseCsvParam(searchParams.get('walletId'));
  const paymentType = parseCsvParam(searchParams.get('paymentType'));
  const year = Number(searchParams.get('year')) || undefined;
  const month = Number(searchParams.get('month')) || undefined;

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

  // Determine date range if year/month provided (use Date objects for Prisma)
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;
  if (year && month) {
    startDateObj = new Date(year, month - 1, 1);
    endDateObj = new Date(year, month, 0);
  }

  const today = new Date();
  const isCurrentMonth = year && month && today.getFullYear() === year && today.getMonth() + 1 === month;
  const effectiveEnd = isCurrentMonth && startDateObj ? new Date(year, month - 1, today.getDate()) : endDateObj;

  // Helper to include date filter
  const dateWhere = startDateObj && endDateObj ? { AND: [{ date: { gte: startDateObj } }, { date: { lte: endDateObj } }] } : {};

  // Fetch totals including RECURRING items expanded for the period.
  // PUNCTUAL items can be aggregated directly; RECURRING items need to be expanded
  // across months that intersect the requested period.
  const whereBase = { user: { email: session.user.email }, ...walletFilter, ...paymentTypeFilter };

  // For monthly totals we restrict by date
  const expensesWhere = { ...whereBase, ...(dateWhere as any) };
  const incomesWhere = { ...whereBase, ...(dateWhere as any) };

  // Aggregate PUNCTUAL amounts
  const [expVarAgg, incVarAgg] = await Promise.all([
    prisma.expense.aggregate({ where: { ...expensesWhere, type: 'PUNCTUAL', transferId: null }, _sum: { amount: true } }),
    prisma.income.aggregate({ where: { ...incomesWhere, type: 'PUNCTUAL', transferId: null }, _sum: { amount: true } }),
  ]);

  let fixedExpensesSum = 0;
  let fixedIncomesSum = 0;

  // Precise occurrences count for a RECURRING record within a period.
  // Considers dayOfMonth (if present) or fallback to record date's day.
  const countFixedOccurrences = (
    recStart?: Date | null,
    recEnd?: Date | null,
    recordDay?: number | null,
    periodStart?: Date,
    periodEnd?: Date,
  ) => {
    if (!periodStart || !periodEnd) return 0;
    const start = recStart && recStart > periodStart ? recStart : periodStart;
    const end = recEnd && recEnd < periodEnd ? recEnd : periodEnd;
    if (!start || !end) return 0;
    if (start.getTime() > end.getTime()) return 0;
    // iterate month by month from start's month to end's month
    let count = 0;
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor.getTime() <= last.getTime()) {
      const year = cursor.getFullYear();
      const monthIndex = cursor.getMonth();
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const day = recordDay && recordDay > 0 ? Math.min(recordDay, lastDay) : Math.min((recStart ? new Date(recStart).getDate() : 1), lastDay);
      const occDate = new Date(year, monthIndex, day);
      if (occDate.getTime() >= +periodStart && occDate.getTime() <= +periodEnd) count += 1;
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return count;
  };

  // Only compute RECURRING contributions if we have a date range
  if (startDateObj && effectiveEnd) {
    const fixedExpenses = await prisma.expense.findMany({ where: { ...whereBase, type: 'RECURRING', transferId: null }, select: { amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });
    for (const fe of fixedExpenses) {
      const recStart = (fe.startDate ?? fe.date) as Date | null;
      const recEnd = (fe.endDate ?? null) as Date | null;
      const day = typeof (fe as any).dayOfMonth === 'number' ? (fe as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, startDateObj, effectiveEnd);
      if (occurs > 0) fixedExpensesSum += Number(fe.amount || 0) * occurs;
    }

    const fixedIncomes = await prisma.income.findMany({ where: { ...whereBase, type: 'RECURRING', transferId: null }, select: { amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });
    for (const fi of fixedIncomes) {
      const recStart = (fi.startDate ?? fi.date) as Date | null;
      const recEnd = (fi.endDate ?? null) as Date | null;
      const day = typeof (fi as any).dayOfMonth === 'number' ? (fi as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, startDateObj, effectiveEnd);
      if (occurs > 0) fixedIncomesSum += Number(fi.amount || 0) * occurs;
    }
  }

  const totalExpenses = Number(expVarAgg._sum.amount || 0) + fixedExpensesSum;
  const totalIncomes = Number(incVarAgg._sum.amount || 0) + fixedIncomesSum;
  const balance = totalIncomes - totalExpenses;

  // Saldo acumulado até endDate (if provided) or all time
  let saldoAcumulado = 0;
  if (endDateObj) {
    // saldo acumulado até endDate: include PUNCTUAL aggregates and RECURRING expanded until endDate
    const prevWhere = { ...whereBase, date: { lte: effectiveEnd || endDateObj } } as any;
    const [prevVarExpAgg, prevVarIncAgg] = await Promise.all([
      prisma.expense.aggregate({ where: { ...whereBase, type: 'PUNCTUAL', transferId: null, date: { lte: effectiveEnd || endDateObj } }, _sum: { amount: true } }),
      prisma.income.aggregate({ where: { ...whereBase, type: 'PUNCTUAL', transferId: null, date: { lte: effectiveEnd || endDateObj } }, _sum: { amount: true } }),
    ]);
    let prevFixedExp = 0;
    let prevFixedInc = 0;
    // count recurring occurrences from earliest possible to endDateObj
    const fixedExpensesAll = await prisma.expense.findMany({ where: { ...whereBase, type: 'RECURRING', transferId: null }, select: { amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });
    for (const fe of fixedExpensesAll) {
      const recStart = (fe.startDate ?? fe.date) as Date | null;
      const recEnd = (fe.endDate ?? null) as Date | null;
      const day = typeof (fe as any).dayOfMonth === 'number' ? (fe as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, new Date('1900-01-01'), effectiveEnd || endDateObj);
      if (occurs > 0) prevFixedExp += Number(fe.amount || 0) * occurs;
    }
    const fixedIncomesAll = await prisma.income.findMany({ where: { ...whereBase, type: 'RECURRING', transferId: null }, select: { amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });
    for (const fi of fixedIncomesAll) {
      const recStart = (fi.startDate ?? fi.date) as Date | null;
      const recEnd = (fi.endDate ?? null) as Date | null;
      const day = typeof (fi as any).dayOfMonth === 'number' ? (fi as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, new Date('1900-01-01'), effectiveEnd || endDateObj);
      if (occurs > 0) prevFixedInc += Number(fi.amount || 0) * occurs;
    }
    saldoAcumulado = (Number(prevVarIncAgg._sum.amount || 0) + prevFixedInc) - (Number(prevVarExpAgg._sum.amount || 0) + prevFixedExp);
  } else {
    // all time: aggregate PUNCTUAL and include full RECURRING series
    const [allVarExpAgg, allVarIncAgg] = await Promise.all([
      prisma.expense.aggregate({ where: { ...whereBase, type: 'PUNCTUAL', transferId: null }, _sum: { amount: true } }),
      prisma.income.aggregate({ where: { ...whereBase, type: 'PUNCTUAL', transferId: null }, _sum: { amount: true } }),
    ]);
    let allFixedExp = 0;
    let allFixedInc = 0;
    const fixedExpensesAll = await prisma.expense.findMany({ where: { ...whereBase, type: 'RECURRING', transferId: null }, select: { amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });
    for (const fe of fixedExpensesAll) {
      const recStart = (fe.startDate ?? fe.date) as Date | null;
      const recEnd = (fe.endDate ?? null) as Date | null;
      const day = typeof (fe as any).dayOfMonth === 'number' ? (fe as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, new Date('1900-01-01'), new Date());
      if (occurs > 0) allFixedExp += Number(fe.amount || 0) * occurs;
    }
    const fixedIncomesAll = await prisma.income.findMany({ where: { ...whereBase, type: 'RECURRING', transferId: null }, select: { amount: true, startDate: true, endDate: true, date: true, dayOfMonth: true } });
    for (const fi of fixedIncomesAll) {
      const recStart = (fi.startDate ?? fi.date) as Date | null;
      const recEnd = (fi.endDate ?? null) as Date | null;
      const day = typeof (fi as any).dayOfMonth === 'number' ? (fi as any).dayOfMonth : undefined;
      const occurs = countFixedOccurrences(recStart, recEnd, day ?? null, new Date('1900-01-01'), new Date());
      if (occurs > 0) allFixedInc += Number(fi.amount || 0) * occurs;
    }
    saldoAcumulado = (Number(allVarIncAgg._sum.amount || 0) + allFixedInc) - (Number(allVarExpAgg._sum.amount || 0) + allFixedExp);
  }

  // Limite diário: simple heuristic similar to frontend logic
  let limiteDiario = 0;
  if (year && month) {
    // compute days remaining
    const hoje = new Date();
    const fim = new Date(year, month, 0);
    let diasRestantes = 0;
    if (year < hoje.getFullYear() || (year === hoje.getFullYear() && month - 1 < hoje.getMonth())) diasRestantes = 0;
    else diasRestantes = Math.max(1, fim.getDate() - (year === hoje.getFullYear() && month - 1 === hoje.getMonth() ? hoje.getDate() : 1) + 1);
    limiteDiario = diasRestantes > 0 ? saldoAcumulado / diasRestantes : 0;
  }

  // Wallets list
  const wallets = await prisma.wallet.findMany({ where: { user: { email: session.user.email } }, select: { id: true, name: true, type: true } });

  return NextResponse.json({
    totalExpenses,
    totalIncomes,
    balance,
    saldoAcumulado,
    limiteDiario,
    wallets,
  });
}
