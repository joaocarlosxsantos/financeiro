import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserByApiKeyFromHeader } from '@/lib/apikey';

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
    // Autentica o usuário via API Key no header Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Header Authorization obrigatório' }, { status: 401 });
    }

    const user = await getUserByApiKeyFromHeader(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'API Key inválida' }, { status: 403 });
    }

    const url = new URL(req.url);
    const month = url.searchParams.get('month') || undefined;
    const type = url.searchParams.get('type') || undefined; // 'TIMED' or 'RECURRING'
    const appliesTo = url.searchParams.get('appliesTo') || undefined; // 'EXPENSES', 'INCOMES', or 'BOTH'
    
    const range = monthRange(month);

    // Build where clause for filtering goals
    const whereClause: any = { userId: user.id };
    if (type && (type === 'TIMED' || type === 'RECURRING')) {
      whereClause.type = type;
    }
    if (appliesTo && ['EXPENSES', 'INCOMES', 'BOTH'].includes(appliesTo)) {
      whereClause.appliesTo = appliesTo;
    }

    const goals = await prisma.goal.findMany({ 
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // For each goal compute currentAmount
    const results = await Promise.all(goals.map(async (g: any) => {
      let current = 0;
      const goalAppliesTo = g.appliesTo;

      // TIMED uses goal.startDate..goal.endDate, RECURRING uses month range
      const start = g.type === 'TIMED' ? g.startDate ?? undefined : range?.start;
      const end = g.type === 'TIMED' ? g.endDate ?? undefined : range?.end;

      if (goalAppliesTo === 'EXPENSES' || goalAppliesTo === 'BOTH') {
        // Build where clause supporting multiple categories/tags
        const where: any = { userId: user.id };
        if (start) where.date = { gte: start };
        if (end) where.date = { ...where.date, lte: end };
        
        // Categories: support categoryId (legacy) and categoryIds (array)
        if (g.categoryId) where.categoryId = g.categoryId;
        if (g.categoryIds && g.categoryIds.length > 0) where.categoryId = { in: g.categoryIds };
        
        // Tags: tagFilters must be matched (OR semantics for multiple tags)
        if (g.tagName) where.tags = { has: g.tagName };
        if (g.tagFilters && g.tagFilters.length > 0) {
          where.OR = g.tagFilters.map((t: string) => ({ tags: { has: t } }));
        }
        
        if (g.walletId) where.walletId = g.walletId;

        const agg = await prisma.expense.aggregate({ _sum: { amount: true }, where });
        current += agg._sum.amount || 0;
      }

      if (goalAppliesTo === 'INCOMES' || goalAppliesTo === 'BOTH') {
        // Build where clause for incomes
        const where: any = { userId: user.id };
        if (start) where.date = { gte: start };
        if (end) where.date = { ...where.date, lte: end };
        
        // Categories: support categoryId (legacy) and categoryIds (array)
        if (g.categoryId) where.categoryId = g.categoryId;
        if (g.categoryIds && g.categoryIds.length > 0) where.categoryId = { in: g.categoryIds };
        
        // Tags: tagFilters must be matched (OR semantics for multiple tags)
        if (g.tagName) where.tags = { has: g.tagName };
        if (g.tagFilters && g.tagFilters.length > 0) {
          where.OR = g.tagFilters.map((t: string) => ({ tags: { has: t } }));
        }
        
        if (g.walletId) where.walletId = g.walletId;

        const agg = await prisma.income.aggregate({ _sum: { amount: true }, where });
        current += agg._sum.amount || 0;
      }

      // Calculate progress percentage
      const progress = g.amount > 0 ? Math.min((current / g.amount) * 100, 100) : 0;
      const isCompleted = current >= g.amount;

      return {
        id: g.id,
        title: g.title,
        description: g.description,
        amount: g.amount,
        currentAmount: current,
        progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
        isCompleted,
        type: g.type,
        kind: g.kind,
        operator: g.operator,
        appliesTo: g.appliesTo,
        startDate: g.startDate,
        endDate: g.endDate,
        recurrence: g.recurrence,
        active: g.active,
        category: g.category,
        walletId: g.walletId,
        tagName: g.tagName,
        tagFilters: g.tagFilters,
        categoryIds: g.categoryIds,
        tagAggregates: g.tagAggregates,
        tagNames: g.tagNames,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt
      };
    }));

    return NextResponse.json({
      goals: results,
      total: results.length,
      filters: {
        month,
        type,
        appliesTo
      }
    });

  } catch (error: any) {
    console.error('Error fetching goals:', error);
    
    if (error.status && error.message) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}