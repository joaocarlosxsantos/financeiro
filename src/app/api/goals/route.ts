import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateGoalCurrentAmount, monthRangeFromYearMonth } from '@/lib/goal-progress';

// Helper to parse month YYYY-MM to start/end Date
function monthRange(month?: string) {
  if (!month) return null;
  const [y, m] = month.split('-').map(Number);
  return monthRangeFromYearMonth(y, m);
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

    // For each goal compute currentAmount (lógica compartilhada com o Agente Financeiro,
    // ver src/lib/goal-progress.ts — corrige o bug histórico de metas RECURRING contarem a
    // mesma recorrência duas vezes e ignorarem startDate/endDate).
  const results = await Promise.all(goals.map(async (g: any) => {
      const current = await calculateGoalCurrentAmount(user.id, g, range ?? undefined);

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
