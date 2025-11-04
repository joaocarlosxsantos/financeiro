import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { simulateScenario, getScenarioTemplates, ScenarioParameters } from '@/lib/scenario-simulator';

const scenarioSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().min(1).max(360), // máximo 30 anos
  
  initialBalance: z.number(),
  monthlyIncome: z.number(),
  monthlyExpenses: z.number(),
  monthlySavings: z.number(),
  
  incomeChange: z.number().optional(),
  expensesChange: z.number().optional(),
  savingsChange: z.number().optional(),
  oneTimeExpense: z.number().optional(),
  oneTimeExpenseMonth: z.number().optional(),
  oneTimeIncome: z.number().optional(),
  oneTimeIncomeMonth: z.number().optional(),
  
  inflation: z.number().optional(),
  investmentReturn: z.number().optional(),
  
  color: z.string().optional(),
});

/**
 * GET /api/scenarios
 * Retorna cenários salvos do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Busca cenários salvos
    const scenarios = await prisma.scenario.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cenários' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scenarios
 * Salva um novo cenário
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = scenarioSchema.parse(body);

    const scenario = await prisma.scenario.create({
      data: {
        userId: user.id,
        ...validatedData,
      },
    });

    return NextResponse.json({ scenario }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cenário' },
      { status: 500 }
    );
  }
}
