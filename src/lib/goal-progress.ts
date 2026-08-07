/**
 * Cálculo do progresso de uma meta financeira (Goal).
 *
 * Extraído de `/api/goals` (GET) para ser reutilizável — o mesmo cálculo agora também
 * alimenta o contexto do Agente Financeiro (IA), que antes retornava sempre
 * `currentAmount: 0, progress: 0` (stub). Mantém exatamente a mesma lógica que já existia
 * ali: metas RECURRING somam pontuais (por `date` no mês) + recorrentes expandidas com
 * `expandRecurringAllOccurrencesForMonth` (evita contar a mesma recorrência duas vezes e
 * respeita startDate/endDate/excludedDates); metas TIMED (ou RECURRING sem um mês de
 * referência informado) somam tudo dentro de goal.startDate..goal.endDate.
 */

import { prisma } from '@/lib/prisma';
import { expandRecurringAllOccurrencesForMonth } from '@/lib/transaction-filters';

export interface GoalLike {
  type: string; // 'TIMED' | 'RECURRING'
  appliesTo: string; // 'EXPENSES' | 'INCOMES' | 'BOTH'
  amount: any;
  categoryId?: string | null;
  categoryIds?: string[] | null;
  tagName?: string | null;
  tagFilters?: string[] | null;
  walletId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface GoalMonthRange {
  start: Date;
  end: Date;
  year: number;
  month: number;
}

export interface GoalProgressResult {
  currentAmount: number;
  targetAmount: number;
  progress: number; // 0-100
}

/** Mês/ano -> intervalo de datas, no mesmo formato usado por /api/goals. */
export function monthRangeFromYearMonth(year: number, month: number): GoalMonthRange {
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    year,
    month,
  };
}

/** Mês/ano do mês atual (usado como padrão quando nenhum período é especificado). */
export function currentMonthRange(referenceDate: Date = new Date()): GoalMonthRange {
  return monthRangeFromYearMonth(referenceDate.getFullYear(), referenceDate.getMonth() + 1);
}

export async function calculateGoalCurrentAmount(
  userId: string,
  g: GoalLike,
  monthRange?: GoalMonthRange
): Promise<number> {
  let current = 0;
  const range = g.type === 'RECURRING' ? monthRange ?? null : null;

  const start = g.type === 'TIMED' ? g.startDate ?? undefined : range?.start;
  const end = g.type === 'TIMED' ? g.endDate ?? undefined : range?.end;

  const buildBaseWhere = () => {
    const w: any = { userId };
    if (g.categoryId) w.categoryId = g.categoryId;
    if (g.categoryIds && g.categoryIds.length > 0) w.categoryId = { in: g.categoryIds };
    if (g.tagName) w.tags = { has: g.tagName };
    if (g.tagFilters && g.tagFilters.length > 0) w.OR = g.tagFilters.map((t: string) => ({ tags: { has: t } }));
    if (g.walletId) w.walletId = g.walletId;
    return w;
  };

  async function sumForModel(model: 'expense' | 'income'): Promise<number> {
    const client = model === 'expense' ? prisma.expense : prisma.income;
    let sum = 0;

    if (g.type === 'RECURRING' && range) {
      const punctualWhere = { ...buildBaseWhere(), type: 'PUNCTUAL', date: { gte: range.start, lte: range.end } };
      const punctualAgg = await (client as any).aggregate({ _sum: { amount: true }, where: punctualWhere });
      sum += Number(punctualAgg._sum.amount ?? 0);

      const recurringWhere = { ...buildBaseWhere(), type: 'RECURRING' };
      const recurringRecords = await (client as any).findMany({
        where: recurringWhere,
        select: { id: true, amount: true, date: true, endDate: true, excludedDates: true, type: true },
      });
      const occurrences = expandRecurringAllOccurrencesForMonth(
        recurringRecords as any,
        range.year,
        range.month,
        new Date()
      );
      for (const occ of occurrences) sum += Number((occ as any).amount);
    } else {
      const where: any = buildBaseWhere();
      if (start) where.date = { gte: start };
      if (end) where.date = { ...where.date, lte: end };
      const agg = await (client as any).aggregate({ _sum: { amount: true }, where });
      sum += Number(agg._sum.amount ?? 0);
    }

    return sum;
  }

  if (g.appliesTo === 'EXPENSES' || g.appliesTo === 'BOTH') {
    current += await sumForModel('expense');
  }
  if (g.appliesTo === 'INCOMES' || g.appliesTo === 'BOTH') {
    current += await sumForModel('income');
  }

  return current;
}

/**
 * Igual a `calculateGoalCurrentAmount`, mas já devolve o percentual de progresso
 * (0-100), usando a mesma fórmula da tela de Metas (`GoalCard.tsx`):
 * `Math.min(100, Math.round((currentAmount / amount) * 100))`.
 *
 * Sem `monthRange`, metas RECURRING usam o mês atual como referência (o que faz sentido
 * para "como estão minhas metas agora" — diferente de /api/goals, que só usa o mês atual
 * se o chamador pedir explicitamente).
 */
export async function calculateGoalProgress(
  userId: string,
  g: GoalLike,
  monthRange: GoalMonthRange = currentMonthRange()
): Promise<GoalProgressResult> {
  const currentAmount = await calculateGoalCurrentAmount(userId, g, monthRange);
  const targetAmount = Number(g.amount) || 0;
  const progress = targetAmount > 0 ? Math.min(100, Math.max(0, Math.round((currentAmount / targetAmount) * 100))) : 0;
  return { currentAmount, targetAmount, progress };
}
