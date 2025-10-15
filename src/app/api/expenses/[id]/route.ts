import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  
  // Normalize tags: filter out 'no-tag' values
  let normalizedTags = body.tags ?? [];
  if (Array.isArray(normalizedTags)) {
    normalizedTags = normalizedTags
      .map((t: any) => {
        if (!t) return '';
        if (typeof t === 'string') return t === 'no-tag' ? '' : t;
        if (t.placeholder) return '';
        // Se o ID for 'no-tag', não incluir a tag
        if (t?.id === 'no-tag') return '';
        return t?.name || t?.id || '';
      })
      .filter(Boolean);
  }
  
  try {
    // Validar que carteira é obrigatória (sistema não trabalha mais com cartões de crédito na despesa)
    const paymentType = body.paymentType || 'DEBIT';
    if (!body.walletId) {
      return NextResponse.json({ error: 'Carteira é obrigatória' }, { status: 400 });
    }

    const updated = await prisma.expense.update({
      where: { id: params.id, userId: user.id } as any,
      data: {
        description: body.description,
        amount: body.amount,
        date: body.date ? new Date(body.date) : undefined,
        type: body.type,
        paymentType: paymentType,
        isFixed: body.isFixed,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        dayOfMonth: body.dayOfMonth,
        categoryId: body.categoryId,
        walletId: body.walletId,
        tags: normalizedTags,
      },
      include: { category: true, wallet: true },
    });

    // Process notifications after expense update
    try {
      const { processTransactionAlerts } = await import('@/lib/notifications/processor');
      await processTransactionAlerts(user.id, 'expense');
    } catch (error) {
      console.error('Erro ao processar alertas de despesa:', error);
      // Don't fail the request if notification processing fails
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao atualizar' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.expense.delete({ where: { id: params.id, userId: user.id } as any });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao excluir' }, { status: 400 });
  }
}
