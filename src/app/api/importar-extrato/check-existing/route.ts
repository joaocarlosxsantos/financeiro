import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PeriodCheck {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  sourceFile?: string; // Identificador do arquivo de origem
}

interface CheckExistingRequest {
  periods: PeriodCheck[];
  walletId: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { periods, walletId }: CheckExistingRequest = await req.json();

    if (!Array.isArray(periods) || !walletId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
    }

    // Verificar cada período
    const results = await Promise.all(
      periods.map(async (period) => {
        const startDate = new Date(period.startDate + 'T00:00:00.000Z');
        const endDate = new Date(period.endDate + 'T23:59:59.999Z');

        // Contar incomes
        const incomesCount = await prisma.income.count({
          where: {
            userId: user.id,
            walletId: walletId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Contar expenses
        const expensesCount = await prisma.expense.count({
          where: {
            userId: user.id,
            walletId: walletId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const totalCount = incomesCount + expensesCount;

        return {
          startDate: period.startDate,
          endDate: period.endDate,
          sourceFile: period.sourceFile,
          count: totalCount,
          incomesCount,
          expensesCount,
          hasConflict: totalCount > 0,
        };
      })
    );

    // Verificar se há algum conflito
    const hasAnyConflict = results.some((r) => r.hasConflict);
    const totalConflicts = results.reduce((acc, r) => acc + r.count, 0);

    return NextResponse.json({
      hasConflict: hasAnyConflict,
      totalConflicts,
      periods: results,
    });

  } catch (error) {
    console.error('Erro ao verificar registros existentes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
