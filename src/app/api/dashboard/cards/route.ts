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
  const year = Number(searchParams.get('year')) || undefined;
  const month = Number(searchParams.get('month')) || undefined;

  const walletFilter: any = {};
  if (walletId) {
    if (Array.isArray(walletId)) walletFilter.walletId = { in: walletId };
    else walletFilter.walletId = walletId;
  }

  // Determine date range if year/month provided (use Date objects for Prisma)
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;
  if (year && month) {
    startDateObj = new Date(year, month - 1, 1);
    endDateObj = new Date(year, month, 0);
  }

  // Helper to include date filter
  const dateWhere = startDateObj && endDateObj ? { AND: [{ date: { gte: startDateObj } }, { date: { lte: endDateObj } }] } : {};

  // Fetch totals (simplified: sum amounts using prisma aggregate)
  const whereBase = { user: { email: session.user.email }, ...walletFilter };

  // For monthly totals we restrict by date
  const expensesWhere = { ...whereBase, ...(dateWhere as any) };
  const incomesWhere = { ...whereBase, ...(dateWhere as any) };

  const [expAgg, incAgg] = await Promise.all([
    prisma.expense.aggregate({ where: expensesWhere, _sum: { amount: true } }),
    prisma.income.aggregate({ where: incomesWhere, _sum: { amount: true } }),
  ]);

  const totalExpenses = Number(expAgg._sum.amount || 0);
  const totalIncomes = Number(incAgg._sum.amount || 0);
  const balance = totalIncomes - totalExpenses;

  // Saldo acumulado até endDate (if provided) or all time
  let saldoAcumulado = 0;
  if (endDateObj) {
    const prevWhere = { ...whereBase, date: { lte: endDateObj } } as any;
    const [prevExp, prevInc] = await Promise.all([
      prisma.expense.aggregate({ where: prevWhere, _sum: { amount: true } }),
      prisma.income.aggregate({ where: prevWhere, _sum: { amount: true } }),
    ]);
    saldoAcumulado = Number(prevInc._sum.amount || 0) - Number(prevExp._sum.amount || 0);
  } else {
    const [allExp, allInc] = await Promise.all([
      prisma.expense.aggregate({ where: whereBase, _sum: { amount: true } }),
      prisma.income.aggregate({ where: whereBase, _sum: { amount: true } }),
    ]);
    saldoAcumulado = Number(allInc._sum.amount || 0) - Number(allExp._sum.amount || 0);
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
