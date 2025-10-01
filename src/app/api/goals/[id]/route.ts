import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();

  // require at least one of category or tag filters
  const hasCategory = Boolean(body.categoryId || (body.categoryIds && body.categoryIds.length > 0));
  const hasTag = Boolean(body.tagName || (body.tagFilters && body.tagFilters.length > 0) || (body.tagAggregates && body.tagAggregates.length > 0));
  if (!hasCategory && !hasTag) {
    return NextResponse.json({ error: 'É obrigatório informar pelo menos uma categoria ou tag.' }, { status: 400 });
  }

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.userId !== user.id) {
    return NextResponse.json({ error: 'Meta não encontrada ou sem permissão' }, { status: 404 });
  }

  try {
    const updated = await prisma.goal.update({
      where: { id },
      data: {
  title: body.title ?? goal.title,
        description: body.description ?? null,
        type: body.type ?? goal.type,
  kind: body.kind ?? goal.kind,
        operator: body.operator ?? goal.operator,
        amount: body.amount ?? goal.amount,
        categoryId: body.categoryId ?? null,
  categoryIds: body.categoryIds ?? goal.categoryIds,
        tagName: body.tagName ?? null,
  tagFilters: body.tagFilters ?? goal.tagFilters,
  tagAggregates: body.tagAggregates ?? goal.tagAggregates,
  tagNames: body.tagNames ?? goal.tagNames,
        walletId: body.walletId ?? null,
        appliesTo: body.appliesTo ?? goal.appliesTo,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        recurrence: body.recurrence ?? goal.recurrence,
        active: typeof body.active === 'boolean' ? body.active : goal.active,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/goals/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar meta' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.userId !== user.id) {
    return NextResponse.json({ error: 'Meta não encontrada ou sem permissão' }, { status: 404 });
  }

  try {
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/goals/[id] error:', err);
    return NextResponse.json({ error: 'Erro ao deletar meta' }, { status: 500 });
  }
}
