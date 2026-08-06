import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { expandRecurringAllOccurrencesForMonth } from '@/lib/transaction-filters';

// Helper to parse month YYYY-MM to start/end Date
function monthRange(month?: string) {
  if (!month) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end, year: y, month: m };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const url = new URL(req.url);
    const month = url.searchParams.get('month') || undefined;
    const range = monthRange(month);

  const goals = await prisma.goal.findMany({ where: { userId: user.id } });

    // For each goal compute currentAmount
  const results = await Promise.all(goals.map(async (g: any) => {
      let current = 0;
      const appliesTo = g.appliesTo;

      // TIMED uses goal.startDate..goal.endDate, RECURRING uses month range
      const start = g.type === 'TIMED' ? g.startDate ?? undefined : range?.start;
      const end = g.type === 'TIMED' ? g.endDate ?? undefined : range?.end;

      // Monta o where "base" (categoria/tag/carteira) comum às duas estratégias abaixo.
      // Corrige bug: antes, metas RECURRING somavam o mesmo lançamento recorrente duas vezes
      // (uma vez no agregado por `date` e outra vez, sem nenhum filtro de período, no bloco
      // "fixed"), e ainda ignoravam startDate/endDate — uma recorrência já encerrada
      // continuava contribuindo para currentAmount em qualquer mês consultado.
      const buildBaseWhere = () => {
        const w: any = { userId: user.id };
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
          // Pontuais: soma direta pela data dentro do mês da meta
          const punctualWhere = { ...buildBaseWhere(), type: 'PUNCTUAL', date: { gte: range.start, lte: range.end } };
          const punctualAgg = await client.aggregate({ _sum: { amount: true }, where: punctualWhere });
          sum += Number(punctualAgg._sum.amount ?? 0);

          // Recorrentes: expande as ocorrências reais do mês (mesma lógica usada no dashboard),
          // respeitando startDate/endDate/excludedDates — cada recorrência conta uma única vez.
          const recurringWhere = { ...buildBaseWhere(), type: 'RECURRING' };
          const recurringRecords = await client.findMany({
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
          // TIMED (ou sem período informado): mantém o comportamento original —
          // soma tudo cuja `date` caia dentro do intervalo da meta.
          const where: any = buildBaseWhere();
          if (start) where.date = { gte: start };
          if (end) where.date = { ...where.date, lte: end };
          const agg = await client.aggregate({ _sum: { amount: true }, where });
          sum += Number(agg._sum.amount ?? 0);
        }

        return sum;
      }

      if (appliesTo === 'EXPENSES' || appliesTo === 'BOTH') {
        current += await sumForModel('expense');
      }

      if (appliesTo === 'INCOMES' || appliesTo === 'BOTH') {
        current += await sumForModel('income');
      }

      return {
        id: g.id,
        title: g.title,
        kind: g.kind,
        type: g.type,
        operator: g.operator,
        amount: g.amount,
        appliesTo: g.appliesTo,
  categoryId: g.categoryId,
  categoryIds: g.categoryIds ?? [],
  tagName: g.tagName,
  tagFilters: g.tagFilters ?? [],
  tagAggregates: g.tagAggregates ?? [],
  tagNames: g.tagNames ?? [],
        startDate: g.startDate,
        endDate: g.endDate,
        recurrence: g.recurrence,
        active: g.active,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        currentAmount: current
      };
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const body = await req.json();
    const created = await prisma.goal.create({ data: {
      userId: user.id,
      title: body.title || 'Meta',
      description: body.description || null,
      type: body.type || 'RECURRING',
      kind: body.kind || 'ATTAINMENT',
      operator: body.operator || 'AT_LEAST',
      amount: body.amount ? body.amount.toString() : '0',
      categoryId: body.categoryId || null,
      categoryIds: body.categoryIds || [],
      tagName: body.tagName || null,
      tagFilters: body.tagFilters || [],
      tagAggregates: body.tagAggregates || [],
      tagNames: body.tagNames || [],
      walletId: body.walletId || null,
      appliesTo: body.appliesTo || 'BOTH',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      recurrence: body.recurrence || null,
    }});
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 });
  }
}
