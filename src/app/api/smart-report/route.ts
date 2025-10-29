import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { logger } from '../../../lib/logger';
import { getEffectiveDateRange, isTransferCategory, filterRecurringByDay, expandRecurringAllOccurrencesForMonth } from '../../../lib/transaction-filters';
import { getMonthRange } from '../../../lib/utils';
// Expande receitas recorrentes em ocorrências reais do mês consultado
function expandRecurringIncomesForMonth(records: any[], year: number, month: number, today: Date) {
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const { start: monthStart, end: monthEnd } = getMonthRange(year, month);
  const dayLimit = isCurrentMonth ? today.getDate() : 31;
  const result: any[] = [];
  for (const rec of records) {
    // Se tem endDate e ela é menor que o início do mês, ignora
    if (rec.endDate) {
      const endDateObj = new Date(rec.endDate);
      if (endDateObj < monthStart) continue;
    }
    const recStart = new Date(rec.date);
    // Para cada mês, só gera ocorrência se está dentro do range
    // Para o mês consultado, só gera até o dia atual (se mês atual)
    const day = recStart.getDate();
    const recDay = Math.min(day, new Date(year, month, 0).getDate());
    if (isCurrentMonth && recDay > dayLimit) continue;
    // Se endDate existe e é menor que o dia da ocorrência, ignora
    if (rec.endDate) {
      const endDateObj = new Date(rec.endDate);
      const occDate = new Date(year, month - 1, recDay);
      if (endDateObj < occDate) continue;
    }
    // Só inclui se a ocorrência está dentro do mês
    const occDate = new Date(year, month - 1, recDay);
    if (occDate >= monthStart && occDate <= monthEnd) {
      result.push({ ...rec, date: occDate });
    }
  }
  return result;
}

const SmartReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
  walletId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn('Tentativa de acesso não autenticado em /api/smart-report');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawWalletId = searchParams.get('walletId');
  const queryParams = {
    month: searchParams.get('month'),
    walletId: rawWalletId || undefined,
  };

  const validationResult = SmartReportQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError(
      'Validação falhou em /api/smart-report',
      validationResult.error.flatten().fieldErrors,
      { email: session.user.email }
    );
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { month, walletId } = validationResult.data;

  try {
    const [year, monthNum] = month.split('-').map(Number);
    const { startDate, endDate } = getEffectiveDateRange(year, monthNum);

    // Get previous month for comparison
    const prevMonthStart = new Date(year, monthNum - 2, 1);
    const prevMonthEnd = new Date(year, monthNum - 1, 0, 23, 59, 59, 999);

    // Construir where base
    const whereBase: any = { user: { email: session.user.email } };
    if (walletId) {
      whereBase.walletId = walletId;
    }

    // Buscar PUNCTUAL e RECURRING
    const [punctualExpenses, punctualIncomes, recurringExpenses, recurringIncomes] = await Promise.all([
      prisma.expense.findMany({
        where: { ...whereBase, type: 'PUNCTUAL', transferId: null, date: { gte: startDate, lte: endDate } },
        select: { id: true, amount: true, description: true, date: true, category: { select: { name: true } }, type: true },
      }),
      prisma.income.findMany({
        where: { ...whereBase, type: 'PUNCTUAL', transferId: null, date: { gte: startDate, lte: endDate } },
        select: { id: true, amount: true, description: true, date: true, category: { select: { name: true } }, type: true },
      }),
      prisma.expense.findMany({
        where: { ...whereBase, type: 'RECURRING', transferId: null },
        select: { id: true, amount: true, description: true, date: true, category: { select: { name: true } }, type: true },
      }),
      prisma.income.findMany({
        where: { ...whereBase, type: 'RECURRING', transferId: null },
        select: { id: true, amount: true, description: true, date: true, category: { select: { name: true } }, type: true },
      }),
    ]);

    // Combinar PUNCTUAL + RECURRING
    const allExpenses = [...punctualExpenses, ...recurringExpenses];
    const allIncomes = [...punctualIncomes, ...recurringIncomes];

    // Filtrar transferências
    const filteredExpenses = allExpenses.filter((e: any) => !isTransferCategory(e));
    const filteredIncomes = allIncomes.filter((i: any) => !isTransferCategory(i));



  // Expandir recorrentes em todas as ocorrências do mês para ganhos e despesas (igual dashboard)
  const today = new Date();
  const finalIncomes = expandRecurringAllOccurrencesForMonth(filteredIncomes, year, monthNum, today);
  const finalExpenses = expandRecurringAllOccurrencesForMonth(filteredExpenses, year, monthNum, today);


  // Calcular totais
  const totalExpenses = finalExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
  const totalIncome = finalIncomes.reduce((sum: number, inc: any) => sum + Number(inc.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  // Redefinir isCurrentMonth para uso posterior
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;


    // Previous month
    const [prevMonthExpenses, prevMonthIncomes] = await Promise.all([
      prisma.expense.findMany({
        where: { ...whereBase, transferId: null, date: { gte: prevMonthStart, lte: prevMonthEnd } },
        select: { amount: true },
      }),
      prisma.income.findMany({
        where: { ...whereBase, transferId: null, date: { gte: prevMonthStart, lte: prevMonthEnd } },
        select: { amount: true },
      }),
    ]);

    const prevTotalIncome = prevMonthIncomes.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0);
    const prevTotalExpenses = prevMonthExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
    const previousMonthBalance = prevTotalIncome - prevTotalExpenses;

    // Métricas
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // const isCurrentMonth já foi declarada acima
  const daysInMonth = endDate.getDate();
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

    const dailyIncomeAvg = lastDay > 0 ? totalIncome / lastDay : 0;
    const dailyExpenseAvg = lastDay > 0 ? totalExpenses / lastDay : 0;

    const projectedIncome = isCurrentMonth ? dailyIncomeAvg * daysInMonth : totalIncome;
    const projectedExpense = isCurrentMonth ? dailyExpenseAvg * daysInMonth : totalExpenses;
    const projectedBalance = projectedIncome - projectedExpense;

    const incomeCount = allIncomes.length;
    const expenseCount = allExpenses.length;
    const recurringIncomeCount = allIncomes.filter((i: any) => i.type === 'RECURRING').length;
    const recurringExpenseCount = allExpenses.filter((e: any) => e.type === 'RECURRING').length;

    // Top 3
    const topIncomes = [...allIncomes].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);
    const topExpenses = [...allExpenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);

    // Média 3 meses
    let avgIncome3m = 0,
      avgExpense3m = 0;
    try {
      const promises: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(year, monthNum - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const s = new Date(y, m - 1, 1);
        const e = new Date(y, m, 0, 23, 59, 59, 999);
        promises.push(
          prisma.income.findMany({
            where: { ...whereBase, transferId: null, date: { gte: s, lte: e } },
            select: { amount: true },
          })
        );
        promises.push(
          prisma.expense.findMany({
            where: { ...whereBase, transferId: null, date: { gte: s, lte: e } },
            select: { amount: true },
          })
        );
      }
      const results = await Promise.all(promises);
      let totalIncome3m = 0,
        totalExpense3m = 0;
      for (let i = 0; i < results.length; i += 2) {
        totalIncome3m += results[i].reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        totalExpense3m += results[i + 1].reduce((sum: number, r: any) => sum + Number(r.amount), 0);
      }
      avgIncome3m = totalIncome3m / 3;
      avgExpense3m = totalExpense3m / 3;
    } catch (error) {
      logger.error('Erro ao calcular média 3m', error, { email: session.user.email });
    }

    // Health score
    const healthScore = savingsRate > 0 ? Math.min(100, Math.round(savingsRate)) : 0;



    return NextResponse.json({
      totalIncome,
      totalExpenses,
      balance,
      previousMonthBalance,
      savingsRate,
      healthScore,
      incomeCount,
      expenseCount,
      recurringIncomeCount,
      recurringExpenseCount,
      dailyIncomeAvg,
      dailyExpenseAvg,
      projectedIncome,
      projectedExpense,
      projectedBalance,
      topIncomes,
      topExpenses,
      avgIncome3m,
      avgExpense3m,
    });
  } catch (error) {
    logger.error('Erro em /api/smart-report', error, { email: session.user.email });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
