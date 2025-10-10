import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBillStatus } from '@/lib/credit-utils';

// POST - Registrar pagamento de fatura
export async function POST(
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
    const { amount, paymentDate, walletId, description } = body;

    // Validações
    if (!amount || !paymentDate || !walletId) {
      return NextResponse.json({
        error: 'Campos obrigatórios: amount, paymentDate, walletId'
      }, { status: 400 });
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({
        error: 'Valor deve ser maior que zero'
      }, { status: 400 });
    }

    // Verificar se a fatura existe
    const bill = await prisma.creditBill.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    // Verificar se a carteira existe
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: user.id,
      },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 });
    }

    // Verificar se não vai pagar mais que o valor da fatura
    const currentPaidAmount = Number(bill.paidAmount);
    const totalAmount = Number(bill.totalAmount);
    const newPaymentAmount = parseFloat(amount);
    
    if (currentPaidAmount + newPaymentAmount > totalAmount) {
      return NextResponse.json({
        error: `Valor excede o saldo devedor. Valor pendente: R$ ${(totalAmount - currentPaidAmount).toFixed(2)}`
      }, { status: 400 });
    }

    // Registrar pagamento em transação
    const result = await prisma.$transaction(async (tx: any) => {
      // Criar o pagamento
      const payment = await tx.billPayment.create({
        data: {
          billId: params.id,
          amount: newPaymentAmount,
          paymentDate: new Date(paymentDate),
          walletId,
          description: description || null,
          userId: user.id,
        },
        include: {
          wallet: true,
          bill: {
            include: {
              creditCard: true,
            },
          },
        },
      });

      // Atualizar valor pago na fatura
      const newPaidAmount = currentPaidAmount + newPaymentAmount;
      const newStatus = calculateBillStatus(
        totalAmount,
        newPaidAmount,
        bill.dueDate,
        new Date()
      );

      const updatedBill = await tx.creditBill.update({
        where: { id: params.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return {
        payment,
        bill: updatedBill,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// GET - Listar pagamentos de uma fatura
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

    // Verificar se a fatura existe
    const bill = await prisma.creditBill.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    // Buscar pagamentos
    const payments = await prisma.billPayment.findMany({
      where: {
        billId: params.id,
        userId: user.id,
      },
      include: {
        wallet: true,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}