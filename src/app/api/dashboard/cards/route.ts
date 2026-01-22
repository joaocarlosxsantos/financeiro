// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { z } from 'zod';
// @ts-ignore
import { prisma } from '../../../../lib/prisma';
// @ts-ignore
import { getServerSession } from 'next-auth';
// @ts-ignore
import { authOptions } from '../../../../lib/auth';
// @ts-ignore
import { logger } from '../../../../lib/logger';
// @ts-ignore
import { fetchAllTransactions, getEffectiveDateRange, filterRecurringByDay, expandRecurringAllOccurrencesForMonth } from '../../../../lib/transaction-filters';

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

// Função para expandir recorrentes até o mês/ano especificado
function expandRecurrentesUntilMonth(records: any[], untilYear: number, untilMonth: number) {
  const expanded: any[] = [];
  const today = new Date();
  
  for (const r of records) {
    // Se não for recorrente, pula (pontuais já estão no array original)
    if (r.type !== 'RECURRING') {
      continue;
    }

    // Recorrente: expande mês a mês
    const recStart = r.date ? new Date(r.date) : new Date(1900, 0, 1);
    const recEnd = r.endDate ? new Date(r.endDate) : new Date(untilYear, untilMonth, 0);
    
    let curYear = recStart.getFullYear();
    let curMonth = recStart.getMonth() + 1;
    
    while (curYear < untilYear || (curYear === untilYear && curMonth <= untilMonth)) {
      const monthStart = new Date(curYear, curMonth - 1, 1);
      const monthEnd = new Date(curYear, curMonth, 0);
      
      // Verifica se está dentro do período da recorrente
      if (monthEnd < recStart || (r.endDate && monthStart > recEnd)) {
        curMonth++;
        if (curMonth > 12) { curMonth = 1; curYear++; }
        continue;
      }
      
      // Dia da ocorrência
      const day = recStart.getDate();
      const lastDayOfMonth = monthEnd.getDate();
      const dayInMonth = Math.min(day, lastDayOfMonth);
      
      // Se for mês atual, só inclui se o dia já passou
      const isCurrentMonth = today.getFullYear() === curYear && today.getMonth() + 1 === curMonth;
      const dayLimit = isCurrentMonth ? today.getDate() : 31;
      
      if (dayInMonth <= dayLimit) {
        expanded.push({ ...r, date: new Date(curYear, curMonth - 1, dayInMonth) });
      }
      
      curMonth++;
      if (curMonth > 12) { curMonth = 1; curYear++; }
    }
  }
  
  return expanded;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn('Tentativa de acesso não autenticado em /api/dashboard/cards');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Buscar informações do usuário incluindo o nome
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true }
  });
  
  const userName = user?.name || '';

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

  // Determine date range if year/month provided
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;
  if (year && month) {
    const { startDate, endDate } = getEffectiveDateRange(year, month);
    startDateObj = startDate;
    endDateObj = endDate;
  }

  const whereBase = { user: { email: session.user.email }, ...walletFilter, ...paymentTypeFilter };


  // ==========================================
  // CÁLCULO DE GANHOS E DESPESAS TOTAIS
  // ==========================================
  // ESTRATÉGIA:
  // 1. Buscar ganhos/despesas PONTUAIS filtrados pela data do mês
  // 2. Buscar ganhos/despesas RECORRENTES sem filtro de data
  // 3. Expandir recorrentes: gerar uma ocorrência para cada um que:
  //    - Já tenha começado (date <= data da ocorrência)
  //    - Ainda esteja vigente (endDate = null OU endDate >= último dia do mês)
  //    - Para mês atual: só até o dia de hoje
  //    - Para meses anteriores: mês completo
  // 4. Combinar pontuais + recorrentes expandidos
  // 5. Somar tudo
  // ==========================================
  
  const [punctualExpenses, punctualIncomes, recurringExpenses, recurringIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { ...whereBase, type: 'PUNCTUAL', date: { gte: startDateObj, lte: endDateObj } },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true, endDate: true, description: true }
    }),
    prisma.income.findMany({
      where: { ...whereBase, type: 'PUNCTUAL', date: { gte: startDateObj, lte: endDateObj } },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true, endDate: true, description: true }
    }),
    prisma.expense.findMany({
      where: { ...whereBase, type: 'RECURRING' },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true, endDate: true, description: true, excludedDates: true }
    }),
    prisma.income.findMany({
      where: { ...whereBase, type: 'RECURRING' },
      select: { amount: true, category: { select: { name: true } }, type: true, date: true, endDate: true, description: true, excludedDates: true }
    })
  ]);

  // Combinar PUNCTUAL + RECURRING
  const allExpenses = [...punctualExpenses, ...recurringExpenses];
  const allIncomes = [...punctualIncomes, ...recurringIncomes];

  // Expandir recorrentes em todas as ocorrências válidas do mês
  // A função expandRecurringAllOccurrencesForMonth já aplica as regras:
  // - Inclui recorrentes com endDate = null
  // - Inclui recorrentes com endDate >= último dia do mês
  // - Para mês atual, limita até hoje
  const today = new Date();
  const safeYear = typeof year === 'number' && !isNaN(year) ? year : today.getFullYear();
  const safeMonth = typeof month === 'number' && !isNaN(month) ? month : today.getMonth() + 1;
  const expandedIncomes = expandRecurringAllOccurrencesForMonth(allIncomes, safeYear, safeMonth, today);
  const expandedExpenses = expandRecurringAllOccurrencesForMonth(allExpenses, safeYear, safeMonth, today);

  // Calcular totais (sem filtrar transferências)
  const totalIncomes = expandedIncomes.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
  const totalExpenses = expandedExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  const balance = totalIncomes - totalExpenses;

  // Wallets list
  const wallets = await prisma.wallet.findMany({ 
    where: { user: { email: session.user.email } }, 
    select: { id: true, name: true, type: true } 
  });

  return NextResponse.json({
    totalExpenses,
    totalIncomes,
    balance,
    wallets,
  });
}
