import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Marcar como rota dinâmica
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Buscar todos os dados relacionados ao crédito
    const [creditCards, creditExpenses, billItems, creditBills] = await Promise.all([
      prisma.creditCard.findMany({
        where: { userId: user.id },
        select: { id: true, name: true }
      }),
      prisma.creditExpense.findMany({
        where: { userId: user.id },
        select: { id: true, description: true, amount: true, createdAt: true }
      }),
      prisma.creditBillItem.findMany({
        where: { 
          creditExpense: { userId: user.id }
        },
        select: { id: true, amount: true, installmentNumber: true, dueDate: true }
      }),
      prisma.creditBill.findMany({
        where: { userId: user.id },
        select: { id: true, month: true, year: true, totalAmount: true, status: true }
      })
    ]);

    return NextResponse.json({
      debug: {
        userId: user.id,
        creditCards: creditCards.length,
        creditExpenses: creditExpenses.length,
        billItems: billItems.length,
        creditBills: creditBills.length
      },
      data: {
        creditCards,
        creditExpenses,
        billItems,
        creditBills
      }
    });

  } catch (error) {
    console.error('Erro no debug:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}