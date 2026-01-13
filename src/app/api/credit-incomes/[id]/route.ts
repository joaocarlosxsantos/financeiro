import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recalculateBillTotal } from '@/lib/credit-bill-utils';

/**
 * API para excluir um crédito de cartão de crédito
 * DELETE /api/credit-incomes/[id]
 */
export async function DELETE(
  req: NextRequest,
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

    // Buscar o crédito existente
    const existingIncome = await prisma.creditIncome.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        creditBill: {
          include: {
            payments: true, // Incluir pagamentos para verificar se a fatura foi paga
          }
        },
      },
    });

    if (!existingIncome) {
      return NextResponse.json({ error: 'Crédito não encontrado' }, { status: 404 });
    }

    // Verificar se está em fatura fechada E se há pagamentos vinculados
    if (existingIncome.creditBill && existingIncome.creditBill.status !== 'PENDING') {
      // Se a fatura está fechada mas não tem pagamentos, permite exclusão
      const hasPayments = existingIncome.creditBill.payments && existingIncome.creditBill.payments.length > 0;
      
      if (hasPayments) {
        return NextResponse.json({
          error: 'Não é possível excluir créditos de faturas que já foram pagas'
        }, { status: 400 });
      }
      
      // Fatura fechada mas sem pagamentos - permite exclusão
      // (provavelmente foi fechada automaticamente por estar com valor 0)
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx: any) => {
      const billId = existingIncome.creditBillId;

      // Deletar o crédito
      await tx.creditIncome.delete({
        where: { id: params.id },
      });

      // Se estava associado a uma fatura, recalcular o total
      if (billId) {
        await recalculateBillTotal(tx, billId);
      }

      return { affectedBill: billId ? 1 : 0 };
    });

    return NextResponse.json({ 
      message: 'Crédito excluído com sucesso',
      affectedBill: result.affectedBill
    });
  } catch (error) {
    console.error('Erro ao excluir crédito:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
