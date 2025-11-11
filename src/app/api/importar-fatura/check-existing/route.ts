import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateClosingDate, calculateDueDate } from '@/lib/credit-utils';

/**
 * API para verificar se já existem registros de fatura para um período específico
 * POST /api/importar-fatura/check-existing
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ 
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  }

  try {
    const { creditCardId, year, month } = await req.json();

    if (!creditCardId || !year || !month) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Buscar o cartão
    const creditCard = await prisma.creditCard.findFirst({
      where: { 
        id: creditCardId,
        userId: user.id 
      }
    });

    if (!creditCard) {
      return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
    }

    // Calcular as datas de fechamento e vencimento para o período
    // IMPORTANTE: month está em formato 1-based (1-12), então subtraímos 1
    const closingDate = calculateClosingDate(creditCard as any, year, month - 1);
    const dueDate = calculateDueDate(creditCard as any, year, month - 1);

    // Buscar fatura existente
    const existingBill = await prisma.creditBill.findFirst({
      where: {
        creditCardId: creditCardId,
        userId: user.id,
        closingDate: closingDate,
      },
      include: {
        creditExpenses: true,
        creditIncomes: true,
      }
    });

    if (!existingBill) {
      return NextResponse.json({
        hasConflict: false,
        conflicts: [],
        totalConflicts: 0,
      });
    }

    // Calcular totais
    const totalExpenses = existingBill.creditExpenses.length;
    const totalIncomes = existingBill.creditIncomes.length;
    const totalConflicts = totalExpenses + totalIncomes;

    const conflicts = [{
      startDate: closingDate.toISOString().split('T')[0],
      endDate: dueDate.toISOString().split('T')[0],
      sourceFile: `Fatura ${month}/${year}`,
      count: totalConflicts,
      incomesCount: totalIncomes,
      expensesCount: totalExpenses,
      hasConflict: true,
    }];

    return NextResponse.json({
      hasConflict: true,
      conflicts,
      totalConflicts,
      billId: existingBill.id,
    });

  } catch (error) {
    console.error('Erro ao verificar fatura existente:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar fatura existente' },
      { status: 500 }
    );
  }
}
