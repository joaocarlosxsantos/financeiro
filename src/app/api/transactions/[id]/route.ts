import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const id = params.id;
  const data = await req.json();
  // Garante que a data está em formato ISO-8601
  let dateISO: string | null = null;
  if (data.date) {
    // Se já for string ISO, mantém; se for só AAAA-MM-DD, converte para ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      dateISO = new Date(data.date + 'T00:00:00.000Z').toISOString();
    } else {
      dateISO = new Date(data.date).toISOString();
    }
  }
  let updated = null;
  
  // Busca os nomes das tags pelos IDs se fornecido
  let tagNames: string[] | undefined = undefined;
  if (data.tagIds && Array.isArray(data.tagIds) && data.tagIds.length > 0) {
    const tags = await prisma.tag.findMany({
      where: {
        id: { in: data.tagIds },
        userId: (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id
      },
      select: { name: true }
    });
    tagNames = tags.map(tag => tag.name);
  } else if (data.tagIds && Array.isArray(data.tagIds) && data.tagIds.length === 0) {
    // Array vazio = remover todas as tags
    tagNames = [];
  }
  
  // Prepara o campo type apenas se for PUNCTUAL ou RECURRING (não expense/income)
  const transactionType = (data.type === 'PUNCTUAL' || data.type === 'RECURRING') 
    ? data.type 
    : undefined;
  
  try {
    updated = await prisma.expense.update({
      where: { id, user: { email: session.user.email } },
      data: {
        description: data.description,
        amount: Number(data.amount),
        date: dateISO,
        categoryId: data.categoryId || null,
        walletId: data.walletId || null,
        type: transactionType,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        dayOfMonth: data.dayOfMonth !== undefined ? data.dayOfMonth : undefined,
        ...(tagNames !== undefined && { tags: { set: tagNames } }),
      },
    });
  } catch (e) {
    // Tenta income se não for expense
    try {
      updated = await prisma.income.update({
        where: { id, user: { email: session.user.email } },
        data: {
          description: data.description,
          amount: Number(data.amount),
          date: dateISO,
          categoryId: data.categoryId || null,
          walletId: data.walletId || null,
          type: transactionType,
          isRecurring: data.isRecurring !== undefined ? data.isRecurring : undefined,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          dayOfMonth: data.dayOfMonth !== undefined ? data.dayOfMonth : undefined,
          ...(tagNames !== undefined && { tags: { set: tagNames } }),
        },
      });
    } catch (e2) {
      logger.error('PUT /api/transactions/[id] erro', e2, { id });
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const id = params.id;
  let deleted = null;
  try {
    deleted = await prisma.expense.delete({
      where: { id, user: { email: session.user.email } },
    });
  } catch (e) {
    try {
      deleted = await prisma.income.delete({
        where: { id, user: { email: session.user.email } },
      });
    } catch (e2) {
      logger.error('DELETE /api/transactions/[id] erro', e2, { id });
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }
  }
  return NextResponse.json({ success: true });
}
