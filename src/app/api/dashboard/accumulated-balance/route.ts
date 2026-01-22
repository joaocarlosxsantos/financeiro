import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { logger } from '../../../../lib/logger';
import { getEffectiveDateRange } from '../../../../lib/transaction-filters';

/**
 * Accumulated Balance API Endpoint
 * 
 * @route GET /api/dashboard/accumulated-balance
 * @description Retorna o saldo acumulado até o mês/ano especificado
 * 
 * Calcula:
 * - Soma TODAS as rendas até a data limite
 * - Soma TODAS as despesas até a data limite
 * - Retorna: rendas - despesas
 * 
 * @param {Object} query - Query parameters
 * @param {string} query.year - Ano (YYYY) - obrigatório
 * @param {string} query.month - Mês (1-12) - obrigatório
 * @param {string} [query.walletId] - ID da carteira (ou CSV de IDs) - opcional
 * @param {string} [query.paymentType] - Tipo de pagamento (ou CSV) - opcional
 * 
 * @returns {Object} Saldo acumulado
 * @returns {number} accumulatedBalance - Saldo acumulado total
 * 
 * @throws {401} Usuário não autenticado
 * @throws {400} Parâmetros inválidos
 * @throws {500} Erro ao calcular saldo
 */

const AccumulatedBalanceQuerySchema = z.object({
  year: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(2000).max(2100)),
  month: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(12)),
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
    logger.warn('Tentativa de acesso não autenticado em /api/dashboard/accumulated-balance');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Buscar informações do usuário incluindo o nome
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true }
  });
  
  const userName = user?.name || '';

  const { searchParams } = new URL(req.url);
  
  const queryParams = {
    year: searchParams.get('year'),
    month: searchParams.get('month'),
    walletId: searchParams.get('walletId'),
    paymentType: searchParams.get('paymentType'),
  };

  const validationResult = AccumulatedBalanceQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError('Validação falhou em /api/dashboard/accumulated-balance', validationResult.error.flatten().fieldErrors, {
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

  const whereBase = { user: { email: session.user.email }, ...walletFilter, ...paymentTypeFilter };

  try {
    // Obter data limite (último dia do mês ou dia atual se for mês corrente)
    const { endDate: endDateFinal } = getEffectiveDateRange(year, month);
    
    // Buscar TODAS as transações até a data limite
    const [punctualExpenses, recurringExpenses, punctualIncomes, recurringIncomes] = await Promise.all([
      prisma.expense.findMany({
        where: { ...whereBase, type: 'PUNCTUAL', date: { lte: endDateFinal } },
        select: { amount: true, category: { select: { name: true } }, type: true, date: true, description: true }
      }),
      prisma.expense.findMany({
        where: { ...whereBase, type: 'RECURRING' },
        select: { amount: true, category: { select: { name: true } }, type: true, date: true, startDate: true, endDate: true, dayOfMonth: true, description: true, excludedDates: true }
      }),
      prisma.income.findMany({
        where: { ...whereBase, type: 'PUNCTUAL', date: { lte: endDateFinal } },
        select: { amount: true, category: { select: { name: true } }, type: true, date: true, description: true }
      }),
      prisma.income.findMany({
        where: { ...whereBase, type: 'RECURRING' },
        select: { amount: true, category: { select: { name: true } }, type: true, date: true, startDate: true, endDate: true, dayOfMonth: true, description: true, excludedDates: true }
      })
    ]);

    // Expandir recorrências
    const expandedExpenses: any[] = [...punctualExpenses];
    const expandedIncomes: any[] = [...punctualIncomes];

    // Função para expandir recorrências até uma data, excluindo datas deletadas
    const expandRecurring = (transactions: any[], untilDate: Date) => {
      const expanded: any[] = [];
      for (const t of transactions) {
        const recStart = t.startDate ?? t.date;
        const recEnd = t.endDate ?? untilDate;
        const effectiveEnd = recEnd < untilDate ? recEnd : untilDate;
        
        if (!recStart) continue;
        
        const dayOfMonth = typeof t.dayOfMonth === 'number' && t.dayOfMonth > 0 
          ? t.dayOfMonth 
          : new Date(t.date).getDate();

        // Array de datas excluídas (formato ISO date string YYYY-MM-DD)
        const excludedDates = t.excludedDates || [];

        let currentDate = new Date(recStart.getFullYear(), recStart.getMonth(), 1);
        const lastDate = new Date(effectiveEnd.getFullYear(), effectiveEnd.getMonth(), 1);

        while (currentDate <= lastDate) {
          const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          const day = Math.min(dayOfMonth, lastDay);
          const occDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0, 0);

          // Formatar data para comparação com excludedDates (YYYY-MM-DD)
          const occDateString = occDate.toISOString().split('T')[0];

          if (occDate >= recStart && occDate <= effectiveEnd && occDate <= untilDate && !excludedDates.includes(occDateString)) {
            expanded.push({ ...t, date: occDate });
          }

          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }
      }
      return expanded;
    };

    const expandedRecurringExpenses = expandRecurring(recurringExpenses, endDateFinal);
    const expandedRecurringIncomes = expandRecurring(recurringIncomes, endDateFinal);

    expandedExpenses.push(...expandedRecurringExpenses);
    expandedIncomes.push(...expandedRecurringIncomes);

    // Calcular totais (sem filtrar transferências)
    const totalExpenses = expandedExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const totalIncomes = expandedIncomes.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
    const accumulatedBalance = totalIncomes - totalExpenses;

    // Agrupar transações por mês para análise
    const expensesByMonth: Record<string, number> = {};
    const incomesByMonth: Record<string, number> = {};
    
    expandedExpenses.forEach((e: any) => {
      if (e.date) {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        expensesByMonth[key] = (expensesByMonth[key] || 0) + Number(e.amount || 0);
      }
    });
    
    expandedIncomes.forEach((i: any) => {
      if (i.date) {
        const d = new Date(i.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        incomesByMonth[key] = (incomesByMonth[key] || 0) + Number(i.amount || 0);
      }
    });

    return NextResponse.json({
      accumulatedBalance,
    });
  } catch (error) {
    logger.error('Erro ao calcular saldo acumulado', { error, userId: session.user.email });
    return NextResponse.json({ error: 'Erro ao calcular saldo acumulado' }, { status: 500 });
  }
}
