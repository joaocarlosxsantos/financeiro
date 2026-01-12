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
  
  // Determinar o modelo (expense ou income)
  const modelType = data.transactionType; // 'expense' ou 'income' vindo do frontend
  
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
    tagNames = tags.map((tag: { name: string }) => tag.name);
  } else if (data.tagIds && Array.isArray(data.tagIds) && data.tagIds.length === 0) {
    // Array vazio = remover todas as tags
    tagNames = [];
  }
  
  // Prepara o campo type apenas se for PUNCTUAL ou RECURRING (não expense/income)
  const recordType = (data.type === 'PUNCTUAL' || data.type === 'RECURRING') 
    ? data.type 
    : undefined;
  
  // Se modelType foi fornecido, usa diretamente o modelo correto
  if (modelType === 'expense' || modelType === 'income') {
    const model = modelType === 'expense' ? prisma.expense : prisma.income;
    try {
      // Monta objeto de update apenas com campos fornecidos
      const updateData: any = {};
      
      if (data.description !== undefined) updateData.description = data.description;
      if (data.amount !== undefined) updateData.amount = Number(data.amount);
      if (dateISO !== null) updateData.date = dateISO;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null;
      if (data.walletId !== undefined) updateData.walletId = data.walletId || null;
      if (recordType !== undefined) updateData.type = recordType;
      if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
      if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
      if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
      if (tagNames !== undefined) updateData.tags = { set: tagNames };
      
      updated = await model.update({
        where: { id, user: { email: session.user.email } },
        data: updateData,
      });
      return NextResponse.json(updated);
    } catch (e) {
      logger.error('PUT /api/transactions/[id] erro', e, { id });
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }
  }
  
  // Fallback: tenta expense primeiro, depois income (para compatibilidade com código antigo)
  try {
    updated = await prisma.expense.update({
      where: { id, user: { email: session.user.email } },
      data: {
        description: data.description,
        amount: Number(data.amount),
        date: dateISO,
        categoryId: data.categoryId || null,
        walletId: data.walletId || null,
        type: recordType,
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
          type: recordType,
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const id = params.id;
  const body = await req.json();

  console.log('[POST] ID:', id);
  console.log('[POST] Body:', body);
  console.log('[POST] User:', session.user.email);

  // Verificar se é uma requisição de exclude-occurrence
  if (body.action === 'exclude-occurrence' && body.date) {
    const { date, transactionType } = body;

    if (!transactionType || (transactionType !== 'expense' && transactionType !== 'income')) {
      return NextResponse.json({ error: 'transactionType deve ser "expense" ou "income"' }, { status: 400 });
    }

    try {
      const isExpense = transactionType === 'expense';
      const model = isExpense ? prisma.expense : prisma.income;
      
      // Buscar a transação
      const transaction = await model.findUnique({
        where: { id, user: { email: session.user.email } },
      });

      if (!transaction) {
        console.log('[POST] Transaction not found');
        return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
      }

      console.log('[POST] Transaction type:', transaction.type);
      
      if (transaction.type !== 'RECURRING') {
        return NextResponse.json({ error: 'Esta transação não é recorrente' }, { status: 400 });
      }

      // Adicionar a data na lista de exclusões
      const excludedDates = transaction.excludedDates || [];
      excludedDates.push(date);

      console.log('[POST] Updating excludedDates:', excludedDates);

      // Atualizar a transação com as datas excluídas
      await model.update({
        where: { id },
        data: { excludedDates: excludedDates },
      });

      logger.info(`Ocorrência excluída: ${id} - ${date}`);

      return NextResponse.json({ 
        success: true, 
        message: 'Ocorrência excluída com sucesso' 
      });

    } catch (error) {
      logger.error('POST /api/transactions/[id] exclude-occurrence erro', error, { id, date });
      return NextResponse.json(
        { error: 'Erro ao excluir ocorrência' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const id = params.id;
  
  // Pegar transactionType da query string
  const { searchParams } = new URL(req.url);
  const transactionType = searchParams.get('transactionType');
  
  // Se transactionType foi fornecido, usa diretamente o modelo correto
  if (transactionType === 'expense' || transactionType === 'income') {
    const model = transactionType === 'expense' ? prisma.expense : prisma.income;
    try {
      await model.delete({
        where: { id, user: { email: session.user.email } },
      });
      return NextResponse.json({ success: true });
    } catch (e) {
      logger.error('DELETE /api/transactions/[id] erro', e, { id });
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }
  }
  
  // Fallback: tenta expense primeiro, depois income (para compatibilidade com código antigo)
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
