import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FinancialContext, AssistantInsight, ChatResponse } from '@/types/ai-assistant';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { analyzeQuery, generateSmartResponse } from '@/lib/ai-assistant-processor';

/**
 * Coleta contexto financeiro completo do usuário
 * Agora inclui dados de cartões de crédito e análises mais detalhadas
 */
async function getFinancialContext(userId: string): Promise<FinancialContext> {
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, 2)); // Últimos 3 meses
  const endDate = endOfMonth(now);

  // Buscar transações do período
  const [incomes, expenses, wallets, goals] = await Promise.all([
    prisma.income.findMany({
      where: { 
        userId,
        date: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    }),
    prisma.expense.findMany({
      where: { 
        userId,
        date: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    }),
    prisma.wallet.findMany({
      where: { userId },
      select: { 
        id: true, 
        name: true, 
        type: true,
        incomes: {
          select: { amount: true }
        },
        expenses: {
          select: { amount: true }
        }
      }
    }),
    prisma.goal.findMany({
      where: { userId, active: true },
      select: { 
        title: true,
        description: true,
        type: true,
        kind: true,
        operator: true,
        amount: true,
        startDate: true,
        endDate: true
      }
    })
  ]);

  // Calcular totais
  const totalIncome = incomes.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;

  // Agrupar despesas por categoria
  const expensesByCategory = expenses.reduce((acc: Record<string, number>, exp: any) => {
    const catName = exp.category?.name || 'Sem categoria';
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  // Agrupar receitas por categoria
  const incomesByCategory = incomes.reduce((acc: Record<string, number>, inc: any) => {
    const catName = inc.category?.name || 'Sem categoria';
    if (!acc[catName]) acc[catName] = 0;
    acc[catName] += Number(inc.amount);
    return acc;
  }, {} as Record<string, number>);

  // Top categorias de despesas
  const topExpenseCategories = Object.entries(expensesByCategory)
    .map(([name, total]) => ({
      name,
      type: 'EXPENSE' as const,
      total: total as number,
      percentage: totalExpense > 0 ? ((total as number) / totalExpense) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top categorias de receitas
  const topIncomeCategories = Object.entries(incomesByCategory)
    .map(([name, total]) => ({
      name,
      type: 'INCOME' as const,
      total: total as number,
      percentage: totalIncome > 0 ? ((total as number) / totalIncome) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Despesas recorrentes
  const recurringExpenses = expenses
    .filter((e: any) => e.isRecurring)
    .map((e: any) => ({
      description: e.description,
      amount: Number(e.amount),
      frequency: 'Mensal' // Pode ser expandido
    }))
    .slice(0, 10);

  // Transações recentes (últimas 10)
  const recentTransactions = [
    ...expenses.map((e: any) => ({
      date: e.date,
      description: e.description,
      amount: Number(e.amount),
      type: 'EXPENSE' as const,
      category: e.category?.name
    })),
    ...incomes.map((i: any) => ({
      date: i.date,
      description: i.description,
      amount: Number(i.amount),
      type: 'INCOME' as const,
      category: i.category?.name
    }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return {
    userId,
    period: { start: startDate, end: endDate },
    summary: {
      totalIncome,
      totalExpense,
      balance,
      savingsRate
    },
    topCategories: [...topExpenseCategories, ...topIncomeCategories],
    wallets: wallets.map((w: any) => {
      // Calcular saldo da carteira
      const totalIncomes = w.incomes?.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0) || 0;
      const totalExpenses = w.expenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0) || 0;
      const balance = totalIncomes - totalExpenses;
      
      return {
        id: w.id,
        name: w.name,
        balance
      };
    }),
    recurringExpenses,
    goals: goals.map((g: any) => ({
      name: g.title,
      targetAmount: Number(g.amount),
      currentAmount: 0, // Seria necessário calcular baseado nas transações
      progress: 0 // Simplificado por enquanto
    })),
    recentTransactions
  };
}

/**
 * Gera insights automáticos baseados no contexto financeiro
 */
function generateInsights(context: FinancialContext): AssistantInsight[] {
  const insights: AssistantInsight[] = [];
  const { summary, topCategories, recurringExpenses } = context;

  // Insight sobre taxa de poupança
  if (summary.savingsRate > 20) {
    insights.push({
      type: 'savings',
      priority: 'high',
      title: 'Excelente controle financeiro!',
      description: `Você está poupando ${summary.savingsRate.toFixed(1)}% da sua renda.`,
      suggestion: 'Considere investir essa economia para fazer seu dinheiro crescer.',
      impact: { percentage: summary.savingsRate }
    });
  } else if (summary.savingsRate < 5) {
    insights.push({
      type: 'warning',
      priority: 'high',
      title: 'Taxa de poupança muito baixa',
      description: `Você está poupando apenas ${summary.savingsRate.toFixed(1)}% da sua renda.`,
      suggestion: 'Tente cortar 10% dos gastos nas categorias principais para aumentar sua reserva.',
      impact: { percentage: summary.savingsRate }
    });
  }

  // Insight sobre categoria de maior gasto
  const topExpense = topCategories.find(c => c.type === 'EXPENSE');
  if (topExpense && topExpense.percentage > 30) {
    insights.push({
      type: 'spending',
      priority: 'medium',
      title: `Gastos altos em ${topExpense.name}`,
      description: `${topExpense.percentage.toFixed(1)}% das suas despesas são em ${topExpense.name}.`,
      suggestion: `Analise se há oportunidades de economia nesta categoria.`,
      impact: { 
        amount: topExpense.total,
        percentage: topExpense.percentage 
      }
    });
  }

  // Insight sobre despesas recorrentes
  const totalRecurring = recurringExpenses.reduce((sum, r) => sum + r.amount, 0);
  if (totalRecurring > summary.totalExpense * 0.5) {
    insights.push({
      type: 'budget',
      priority: 'medium',
      title: 'Muitos gastos recorrentes',
      description: `R$ ${totalRecurring.toFixed(2)} em despesas fixas mensais.`,
      suggestion: 'Revise suas assinaturas e contratos. Cancelar serviços não utilizados pode liberar dinheiro.',
      impact: { amount: totalRecurring }
    });
  }

  // Insight sobre metas
  const goalsNearCompletion = context.goals?.filter(g => g.progress > 80 && g.progress < 100);
  if (goalsNearCompletion && goalsNearCompletion.length > 0) {
    const goal = goalsNearCompletion[0];
    insights.push({
      type: 'goal',
      priority: 'high',
      title: `Meta "${goal.name}" quase alcançada!`,
      description: `Faltam apenas R$ ${(goal.targetAmount - goal.currentAmount).toFixed(2)}.`,
      suggestion: 'Considere fazer um aporte extra para completar sua meta.',
      impact: { amount: goal.targetAmount - goal.currentAmount }
    });
  }

  // Dica geral
  insights.push({
    type: 'tip',
    priority: 'low',
    title: 'Dica do consultor',
    description: 'A regra 50-30-20 sugere: 50% para necessidades, 30% para desejos, 20% para poupança.',
    suggestion: 'Compare seus gastos com essa regra para identificar ajustes.'
  });

  return insights;
}

/**
 * Gera resposta do assistente usando IA (ou fallback para regras)
 */
async function generateAssistantResponse(
  userMessage: string,
  context: FinancialContext
): Promise<ChatResponse> {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  // Se tiver OpenAI configurada, usar IA real
  if (openaiKey) {
    try {
      const systemPrompt = `Você é um consultor financeiro pessoal especializado. Analise os dados financeiros do usuário e forneça insights valiosos, sugestões de economia e conselhos práticos.

Contexto do usuário:
- Período: ${format(context.period.start, 'dd/MM/yyyy')} a ${format(context.period.end, 'dd/MM/yyyy')}
- Receita total: R$ ${context.summary.totalIncome.toFixed(2)}
- Despesa total: R$ ${context.summary.totalExpense.toFixed(2)}
- Saldo: R$ ${context.summary.balance.toFixed(2)}
- Taxa de poupança: ${context.summary.savingsRate.toFixed(1)}%

Principais categorias de despesa:
${context.topCategories.filter(c => c.type === 'EXPENSE').map(c => 
  `- ${c.name}: R$ ${c.total.toFixed(2)} (${c.percentage.toFixed(1)}%)`
).join('\n')}

Despesas recorrentes: R$ ${context.recurringExpenses.reduce((s, r) => s + r.amount, 0).toFixed(2)}/mês

Responda de forma clara, empática e acionável. Use emojis quando apropriado. Seja conciso mas informativo.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const message = data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';
        
        return {
          message,
          insights: generateInsights(context),
          contextUsed: true,
          suggestions: [
            'Me mostre minhas maiores despesas',
            'Como posso economizar mais?',
            'Qual minha situação financeira?',
            'Estou perto de alcançar minhas metas?'
          ]
        };
      }
    } catch (error) {
      console.error('Erro ao chamar OpenAI:', error);
      // Fallback para resposta baseada em regras
    }
  }

  // Fallback: Resposta baseada em regras
  return generateRuleBasedResponse(userMessage, context);
}

/**
 * Resposta baseada em regras (quando IA não está disponível)
 * Agora usa o processador inteligente para análise de perguntas
 */
function generateRuleBasedResponse(
  userMessage: string,
  context: FinancialContext
): ChatResponse {
  // Analisar intenção da pergunta
  const intent = analyzeQuery(userMessage);
  
  // Gerar resposta inteligente baseada na intenção
  const response = generateSmartResponse(intent, context);
  
  // Adicionar insights se não foram incluídos
  if (!response.insights) {
    response.insights = generateInsights(context);
  }
  
  return response;
}

/**
 * POST /api/ai-assistant/chat
 * Processa mensagem do usuário e retorna resposta do assistente
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { message, includeContext = true } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 });
    }

    // Coletar contexto financeiro
    const context = includeContext 
      ? await getFinancialContext(user.id)
      : null;

    // Gerar resposta
    const response = context 
      ? await generateAssistantResponse(message, context)
      : {
          message: 'Por favor, ative o contexto financeiro para obter análises personalizadas.',
          contextUsed: false
        };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erro no assistente de IA:', error);
    return NextResponse.json(
      { error: 'Erro ao processar mensagem' },
      { status: 500 }
    );
  }
}
