import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { logger } from '../../../../lib/logger';
import { countFixedOccurrences } from '../../../../lib/recurring-utils';

/**
 * Dashboard Cards API Endpoint
 * 
 * @route GET /api/dashboard/cards
 * @description Retorna dados agregados para os 5 cards do dashboard
 * 
 * Calcula:
 * - totalIncome: Ganhos totais no período
 * - totalExpenses: Gastos totais no período
 * - recurringIncome: Ganhos recorrentes não pagos
 * - recurringExpenses: Gastos recorrentes não pagos
 * - dailyLimit: Limite diário de gastos
 * 
 * @param {Object} query - Query parameters
 * @param {string} [query.year] - Ano (YYYY) - opcional
 * @param {string} [query.month] - Mês (1-12) - opcional
 * @param {string} [query.walletId] - ID da carteira (ou CSV de IDs) - opcional
 * @param {string} [query.paymentType] - Tipo de pagamento (ou CSV) - opcional
 * 
 * @returns {Object} Dados dos cards
 * @returns {number} totalIncome - Ganhos totais
 * @returns {number} totalExpenses - Gastos totais
 * @returns {number} recurringIncome - Ganhos recorrentes não pagos
 * @returns {number} recurringExpenses - Gastos recorrentes não pagos
 * @returns {number} dailyLimit - Limite diário configurado
 * @returns {string} limitCurrency - Moeda do limite
 * 
 * @example
 * // Dados do mês atual
 * GET /api/dashboard/cards?year=2025&month=10
 * 
 * @example
 * // Com filtro de carteira
 * GET /api/dashboard/cards?year=2025&month=10&walletId=wallet-123
 * 
 * @throws {401} Usuário não autenticado
 * @throws {400} Parâmetros inválidos
 * @throws {500} Erro ao buscar dados
 */

// Esquema de validação para query parameters
const DashboardCardsQuerySchema = z.object({
  year: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(2000).max(2100)).optional().nullable(),
  month: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(12)).optional().nullable(),
  walletId: z.string().optional().nullable(),
  paymentType: z.string().optional().nullable(),
});

function parseCsvParam(v: string | null | undefined) {
  if (!v) return undefined;
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn('Tentativa de acesso não autenticado em /api/dashboard/cards');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  
  // Validar query parameters com Zod
  const queryParams = {
    year: searchParams.get('year'),
    month: searchParams.get('month'),
    walletId: searchParams.get('walletId'),
    paymentType: searchParams.get('paymentType'),
  };

  const validationResult = DashboardCardsQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError('Validação falhou em /api/dashboard/cards', validationResult.error.flatten().fieldErrors, {
      userId: session.user.email,
    });
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: validationResult.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { year, month, walletId: walletIdParam, paymentType: paymentTypeParam } = validationResult.data;
  const walletId = parseCsvParam(walletIdParam);
  const paymentType = parseCsvParam(paymentTypeParam);

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
