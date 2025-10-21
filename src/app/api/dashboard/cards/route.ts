import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { logger } from '../../../../lib/logger';

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

  // Usar a mesma lógica simples do Smart Report
  // Buscar todos os registros no período e somar em JavaScript
  const [expensesRaw, incomesRaw] = await Promise.all([
    prisma.expense.findMany({
      where: { ...expensesWhere, transferId: null },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true }
    }),
    prisma.income.findMany({
      where: { ...incomesWhere, transferId: null },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true }
    })
  ]);

  // Função para ignorar categoria de transferência (mesmo do Smart Report)
  const isTransferCategory = (item: any) => {
    const cat = item.category?.name || '';
    return cat.trim().toLowerCase() === 'transferência entre contas';
  };

  // Função para filtrar recorrentes: só inclui se dia da data <= dia de hoje
  const filterRecurringByDay = (records: any[]) => {
    const todayDate = new Date();
    const todayDay = todayDate.getDate();
    
    return records.filter((record: any) => {
      if (record.type === 'RECURRING') {
        const recordDate = new Date(record.date);
        const recordDay = recordDate.getDate();
        return recordDay <= todayDay;
      }
      return true; // Mantém PUNCTUAL sempre
    });
  };

  // Filtrar transferências e depois recorrentes pelo dia
  const filteredExpenses = filterRecurringByDay(expensesRaw.filter((e: any) => !isTransferCategory(e)));
  const filteredIncomes = filterRecurringByDay(incomesRaw.filter((i: any) => !isTransferCategory(i)));

  // Calcular totais simples
  const totalExpenses = filteredExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
  const totalIncomes = filteredIncomes.reduce((sum: number, inc: any) => sum + Number(inc.amount || 0), 0);
  const balance = totalIncomes - totalExpenses;

  // Saldo acumulado (histórico até hoje)
  let saldoAcumulado = 0;
  if (endDateObj) {
    const allExpensesUntilNow = await prisma.expense.findMany({
      where: { ...whereBase, transferId: null, date: { lte: effectiveEnd || endDateObj } },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true }
    });
    const allIncomesUntilNow = await prisma.income.findMany({
      where: { ...whereBase, transferId: null, date: { lte: effectiveEnd || endDateObj } },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true }
    });
    
    const filteredExpensesAll = filterRecurringByDay(allExpensesUntilNow.filter((e: any) => !isTransferCategory(e)));
    const filteredIncomesAll = filterRecurringByDay(allIncomesUntilNow.filter((i: any) => !isTransferCategory(i)));
    
    const totalExpensesAll = filteredExpensesAll.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
    const totalIncomesAll = filteredIncomesAll.reduce((sum: number, inc: any) => sum + Number(inc.amount || 0), 0);
    saldoAcumulado = totalIncomesAll - totalExpensesAll;
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
