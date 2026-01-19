import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to parse month YYYY-MM to start/end Date
function monthRange(month?: string) {
  if (!month) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
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

      if (appliesTo === 'EXPENSES' || appliesTo === 'BOTH') {
    // build where clause supporting multiple categories/tags
    const where: any = { userId: user.id };
        if (start) where.date = { gte: start };
        if (end) where.date = { ...where.date, lte: end };
        // categories: support categoryId (legacy) and categoryIds (array)
        if (g.categoryId) where.categoryId = g.categoryId;
        if (g.categoryIds && g.categoryIds.length > 0) where.categoryId = { in: g.categoryIds };
        // tags: tagFilters must be matched (AND semantics not supported by Prisma's has for arrays), we'll treat tagFilters as OR across tags
        if (g.tagName) where.tags = { has: g.tagName };
        if (g.tagFilters && g.tagFilters.length > 0) where.OR = g.tagFilters.map((t: string) => ({ tags: { has: t } }));
        if (g.walletId) where.walletId = g.walletId;

        const agg = await prisma.expense.aggregate({ _sum: { amount: true }, where });
        current += Number(agg._sum.amount ?? 0);

        // add fixed occurrences simplification: if expense.isRecurring true and overlaps range, add amount
        if (g.type === 'RECURRING' && range) {
          const fixedWhere: any = { userId: user.id, isRecurring: true };
          if (g.categoryId) fixedWhere.categoryId = g.categoryId;
          if (g.categoryIds && g.categoryIds.length > 0) fixedWhere.categoryId = { in: g.categoryIds };
          if (g.tagName) fixedWhere.tags = { has: g.tagName };
          if (g.tagFilters && g.tagFilters.length > 0) fixedWhere.OR = g.tagFilters.map((t: string) => ({ tags: { has: t } }));
          const fixed = await prisma.expense.findMany({ where: fixedWhere });
          fixed.forEach((f: any) => { current += Number(f.amount); });
        }
      }

      if (appliesTo === 'INCOMES' || appliesTo === 'BOTH') {
  const where: any = { userId: user.id };
        if (start) where.date = { gte: start };
        if (end) where.date = { ...where.date, lte: end };
  if (g.categoryId) where.categoryId = g.categoryId;
  if (g.categoryIds && g.categoryIds.length > 0) where.categoryId = { in: g.categoryIds };
  if (g.tagName) where.tags = { has: g.tagName };
  if (g.tagFilters && g.tagFilters.length > 0) where.OR = g.tagFilters.map((t: string) => ({ tags: { has: t } }));
  if (g.walletId) where.walletId = g.walletId;

        const agg = await prisma.income.aggregate({ _sum: { amount: true }, where });
        current += Number(agg._sum.amount ?? 0);

        if (g.type === 'RECURRING' && range) {
          const fixedWhere: any = { userId: user.id, isRecurring: true };
          if (g.categoryId) fixedWhere.categoryId = g.categoryId;
          if (g.categoryIds && g.categoryIds.length > 0) fixedWhere.categoryId = { in: g.categoryIds };
          if (g.tagName) fixedWhere.tags = { has: g.tagName };
          if (g.tagFilters && g.tagFilters.length > 0) fixedWhere.OR = g.tagFilters.map((t: string) => ({ tags: { has: t } }));
          const fixed = await prisma.income.findMany({ where: fixedWhere });
          fixed.forEach((f: any) => { current += Number(f.amount); });
        }
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
