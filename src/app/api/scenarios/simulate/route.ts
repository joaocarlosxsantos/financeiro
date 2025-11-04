import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { 
  simulateScenario, 
  compareScenarios, 
  getScenarioTemplates,
  ScenarioParameters,
  ScenarioResult 
} from '@/lib/scenario-simulator';

const simulateSchema = z.object({
  scenarios: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    duration: z.number(),
    
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
  })).min(1).max(5), // máximo 5 cenários simultâneos
});

/**
 * POST /api/scenarios/simulate
 * Simula múltiplos cenários e retorna projeções
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
    const { scenarios } = simulateSchema.parse(body);

    // Simula todos os cenários
    const results: ScenarioResult[] = scenarios.map((scenario, index) => {
      const params: ScenarioParameters = {
        ...scenario,
        id: scenario.id || `scenario-${index}`,
      };
      return simulateScenario(params);
    });

    // Compara os resultados
    const comparison = results.length > 1 ? compareScenarios(results) : null;

    return NextResponse.json({
      results,
      comparison,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error simulating scenarios:', error);
    return NextResponse.json(
      { error: 'Erro ao simular cenários' },
      { status: 500 }
    );
  }
}
