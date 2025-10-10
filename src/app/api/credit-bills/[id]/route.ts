import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBillStatus } from '@/lib/credit-utils';

// GET - Buscar fatura específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const bill = await prisma.creditBill.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        creditCard: true,
        items: {
          include: {
            creditExpense: {
              include: {
                category: true,
              },
            },
          },
          orderBy: [
            { creditExpense: { purchaseDate: 'desc' } },
            { installmentNumber: 'asc' },
          ],
        },
        payments: {
          include: {
            wallet: true,
          },
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    // Atualizar status baseado na data atual
    const updatedStatus = calculateBillStatus(
      Number(bill.totalAmount),
      Number(bill.paidAmount),
      bill.dueDate,
      new Date()
    );

    return NextResponse.json({
      ...bill,
      status: updatedStatus,
    });
  } catch (error) {
    console.error('Erro ao buscar fatura:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PUT - Atualizar fatura (status manual, etc)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { status } = body;

    // Verificar se a fatura existe
    const existingBill = await prisma.creditBill.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!existingBill) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    // Validar status
    const validStatuses = ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({
        error: 'Status inválido. Use: PENDING, PAID, PARTIAL, OVERDUE'
      }, { status: 400 });
    }

    // Atualizar a fatura
    const updatedBill = await prisma.creditBill.update({
      where: { id: params.id },
      data: {
        status: status || existingBill.status,
      },
      include: {
        creditCard: true,
        items: {
          include: {
            creditExpense: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: {
          include: {
            wallet: true,
          },
        },
      },
    });

    return NextResponse.json(updatedBill);
  } catch (error) {
    console.error('Erro ao atualizar fatura:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Deletar fatura (apenas se não tiver pagamentos)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se a fatura existe
    const existingBill = await prisma.creditBill.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        payments: true,
      },
    });

    if (!existingBill) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    // Verificar se há pagamentos
    if (existingBill.payments.length > 0) {
      return NextResponse.json({
        error: 'Não é possível excluir fatura com pagamentos registrados'
      }, { status: 400 });
    }

    // Deletar a fatura em transação
    await prisma.$transaction(async (tx: any) => {
      // Desassociar os itens da fatura
      await tx.creditBillItem.updateMany({
        where: { billId: params.id },
        data: { billId: null },
      });

      // Deletar a fatura
      await tx.creditBill.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: 'Fatura excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir fatura:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}