import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const id = params.id;
  const { date } = await req.json();

  if (!date) {
    return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
  }

  try {
    // Buscar a transação original para verificar se é recorrente
    let transaction = null;
    
    try {
      transaction = await prisma.expense.findUnique({
        where: { id, user: { email: session.user.email } },
      });
    } catch {
      transaction = await prisma.income.findUnique({
        where: { id, user: { email: session.user.email } },
      });
    }

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    if (transaction.type !== 'RECURRING') {
      return NextResponse.json({ error: 'Esta transação não é recorrente' }, { status: 400 });
    }

    // Adicionar a data na lista de exclusões
    const excludedDates = transaction.excludedDates || [];
    excludedDates.push(date);

    // Atualizar a transação com as datas excluídas
    const isExpense = 'amount' in transaction && transaction.amount;
    
    if (isExpense) {
      await prisma.expense.update({
        where: { id },
        data: {
          excludedDates: excludedDates,
        },
      });
    } else {
      await prisma.income.update({
        where: { id },
        data: {
          excludedDates: excludedDates,
        },
      });
    }

    logger.info(`Ocorrência excluída: ${id} - ${date}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Ocorrência excluída com sucesso' 
    });

  } catch (error) {
    logger.error('POST /api/transactions/[id]/exclude-occurrence erro', error, { id, date });
    return NextResponse.json(
      { error: 'Erro ao excluir ocorrência' },
      { status: 500 }
    );
  }
}
