import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { transferId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transferId } = params;

    // Verificar se a transferência existe e pertence ao usuário
    const expense = await prisma.expense.findFirst({
      where: {
        userId: user.id,
        transferId: transferId,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Transferência não encontrada' }, { status: 404 });
    }

    // Excluir ambos os registros em uma transação
    await prisma.$transaction([
      prisma.expense.deleteMany({
        where: {
          userId: user.id,
          transferId: transferId,
        },
      }),
      prisma.income.deleteMany({
        where: {
          userId: user.id,
          transferId: transferId,
        },
      }),
    ]);

    return NextResponse.json({ message: 'Transferência excluída com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir transferência:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}