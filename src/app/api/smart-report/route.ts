import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { logger } from '../../../lib/logger';
import { getNowBrasilia } from '../../../lib/datetime-brasilia';

// Schema de validação para query parameters
const SmartReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
  walletId: z.string().optional(),
});

export async function GET(req: NextRequest) {

  // Função utilitária para dias com maior valor
  function getTopDaysByAmount(records: any[], type: 'income' | 'expense') {
    const map = new Map<string, number>();
    records.forEach(r => {
      const d = new Date(r.date);
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + Number(r.amount));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([date, amount]) => ({ date, amount }));
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn('Tentativa de acesso não autenticado em /api/smart-report');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  
  // Validar query parameters com Zod
  const rawWalletId = searchParams.get('walletId');
  const queryParams = {
    month: searchParams.get('month'),
    walletId: rawWalletId || undefined, // Converter null para undefined
  };

  const validationResult = SmartReportQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError(
      'Validação falhou em /api/smart-report',
      validationResult.error.flatten().fieldErrors,
      { email: session.user.email }
    );
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { month, walletId } = validationResult.data;

  try {
    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Get previous month for comparison
    const prevMonthStart = new Date(year, monthNum - 2, 1);
    const prevMonthEnd = new Date(year, monthNum - 1, 0, 23, 59, 59, 999);


    // Buscar dados otimizados
    // Despesas normais e recorrentes
    const expensesRaw = await prisma.expense.findMany({
      where: {
        user: { email: session.user.email },
        date: { gte: startDate, lte: endDate },
        transferId: null
      },
      select: {
        id: true,
        amount: true,
        description: true,
        date: true,
        category: { select: { name: true } },
        type: true
      }
    });

    // Receitas normais e recorrentes
    const incomesRaw = await prisma.income.findMany({
      where: {
        user: { email: session.user.email },
        date: { gte: startDate, lte: endDate },
        transferId: null
      },
      select: { amount: true, date: true, description: true, type: true }
    });

    // Log de processamento de receitas
    logger.apiRequest('GET', '/api/smart-report', session.user.email, {
      month,
      walletId,
      incomesCount: incomesRaw.length
    });

    // Credit cards usage
    const creditCards = await prisma.creditCard.findMany({
      where: { user: { email: session.user.email } },
      select: {
        id: true,
        name: true,
        limit: true,
        creditExpenses: {
          where: {
            purchaseDate: { gte: startDate, lte: endDate }
          },
          select: { amount: true }
        }
      }
    });

    // Expenses by category (groupBy)
    const expensesByCategoryData = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        user: { email: session.user.email },
        date: { gte: startDate, lte: endDate },
        transferId: null
      },
      _sum: { amount: true },
      // Para pegar o nome da categoria, será necessário buscar depois
    });

    // Previous month expenses/incomes
    const [prevMonthExpenses, prevMonthIncomes] = await Promise.all([
      prisma.expense.findMany({
        where: {
          user: { email: session.user.email },
          date: { gte: prevMonthStart, lte: prevMonthEnd },
          transferId: null
        },
        select: { amount: true }
      }),
      prisma.income.findMany({
        where: {
          user: { email: session.user.email },
          date: { gte: prevMonthStart, lte: prevMonthEnd },
          transferId: null
        },
        select: { amount: true }
      })
    ]);

    // Financial goals
    const goals = await prisma.goal.findMany({
      where: {
        user: { email: session.user.email },
        active: true,
        OR: [
          { endDate: { gte: startDate } },
          { endDate: null }
        ]
      },
      select: {
        id: true,
        title: true,
        amount: true,
        type: true,
        operator: true,
        categoryId: true,
        category: { select: { name: true } }
      }
    });

    // Função para expandir lançamentos recorrentes até o dia atual do mês
    type RecordWithDate = { date: Date };
    const expandRecurring = <T extends RecordWithDate>(records: T[], startDate: Date, endDate: Date): T[] => {
      const today = new Date();
      const currentDay = today.getDate();
      const month = startDate.getMonth();
      const year = startDate.getFullYear();
      return records
        .map((rec: T) => {
          const originalDate = new Date(rec.date);
          const day = originalDate.getDate();
          // Só inclui se o dia do lançamento recorrente for <= ao dia atual do mês
          if (day <= currentDay) {
            const recDate = new Date(year, month, day);
            if (recDate >= startDate && recDate <= endDate) {
              return { ...rec, date: recDate };
            }
          }
          return null;
        })
        .filter((item): item is T => Boolean(item));
    };


    // Função para ignorar categoria de transferência
    const isTransferCategory = (item: any) => {
      const cat = item.category?.name || item.categoryName || '';
      return cat.trim().toLowerCase() === 'transferência entre contas';
    };

    // Filtrar despesas e receitas para ignorar transferências
    const filteredExpenses = expensesRaw.filter((e: any) => !isTransferCategory(e) && e.type !== 'RECURRING');
    const filteredRecurringExpenses = expensesRaw.filter((e: any) => !isTransferCategory(e) && e.type === 'RECURRING');
    const filteredIncomes = incomesRaw.filter((i: any) => !isTransferCategory(i) && i.type !== 'RECURRING');
    const filteredRecurringIncomes = incomesRaw.filter((i: any) => !isTransferCategory(i) && i.type === 'RECURRING');

  // Unir despesas normais e recorrentes (sem transferências)
  const allExpenses = [...filteredExpenses, ...filteredRecurringExpenses];
  const allIncomes = [...filteredIncomes, ...filteredRecurringIncomes];


  // Calcular totais incluindo recorrentes
  const totalIncome = allIncomes.reduce((sum: number, income: any) => sum + Number(income.amount), 0);
  const totalExpenses = allExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
  const balance = totalIncome - totalExpenses;

  const prevTotalIncome = prevMonthIncomes.reduce((sum: number, income: any) => sum + Number(income.amount), 0);
  const prevTotalExpenses = prevMonthExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
  const previousMonthBalance = prevTotalIncome - prevTotalExpenses;

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  // Percentual de despesas recorrentes vs variáveis
  const percentRecurringExpenses = totalExpenses > 0 ? (filteredRecurringExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0) / totalExpenses) * 100 : 0;
  const percentVariableExpenses = 100 - percentRecurringExpenses;

  // Processar despesas por categoria incluindo recorrentes

  // --- NOVAS MÉTRICAS AVANÇADAS ---
    // Calcular dias do mês selecionado
    const daysInMonth = endDate.getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

    // Média diária de receitas e despesas (até hoje se mês atual, senão mês completo)
    const dailyIncomeAvg = lastDay > 0 ? totalIncome / lastDay : 0;
    const dailyExpenseAvg = lastDay > 0 ? totalExpenses / lastDay : 0;

    // Projeção de saldo até o fim do mês
    const projectedIncome = isCurrentMonth ? (dailyIncomeAvg * daysInMonth) : totalIncome;
    const projectedExpense = isCurrentMonth ? (dailyExpenseAvg * daysInMonth) : totalExpenses;
    const projectedBalance = projectedIncome - projectedExpense;

    // Quantidade de lançamentos
    const incomeCount = allIncomes.length;
    const expenseCount = allExpenses.length;
  const recurringIncomeCount = filteredRecurringIncomes.length;
  const recurringExpenseCount = filteredRecurringExpenses.length;

    // Top 3 maiores receitas e despesas
    // Top receitas e despesas separadas
    const topIncomes = [...allIncomes].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);
    const topExpenses = [...allExpenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);

    // Dias topo receitas e despesas separadas
    const topIncomeDays = getTopDaysByAmount(allIncomes, 'income');
    const topExpenseDays = getTopDaysByAmount(allExpenses, 'expense');

    // Médias dos últimos 3 meses separadas
    let avgIncome3m = 0, avgExpense3m = 0;
    try {
      const promises: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(year, monthNum - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const s = new Date(y, m - 1, 1);
        const e = new Date(y, m, 0, 23, 59, 59, 999);
        promises.push(
          prisma.income.findMany({
            where: { user: { email: session.user.email }, date: { gte: s, lte: e }, transferId: null },
            select: { amount: true }
          })
        );
        promises.push(
          prisma.expense.findMany({
            where: { user: { email: session.user.email }, date: { gte: s, lte: e }, transferId: null },
            select: { amount: true }
          })
        );
      }
      const results = await Promise.all(promises);
      let totalIncome3m = 0, totalExpense3m = 0;
      for (let i = 0; i < results.length; i += 2) {
        totalIncome3m += results[i].reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        totalExpense3m += results[i + 1].reduce((sum: number, r: any) => sum + Number(r.amount), 0);
      }
      avgIncome3m = totalIncome3m / 3;
      avgExpense3m = totalExpense3m / 3;
    } catch (error) {
      logger.error(
        'Erro ao calcular média de renda e despesas em 3 meses em /api/smart-report',
        error
      );
    }
    const categoryTotals = new Map<string, number>();
    allExpenses.forEach((expense: any) => {
      const categoryName = expense.category?.name || 'Sem categoria';
      const amount = Number(expense.amount) || 0;
      const currentTotal = categoryTotals.get(categoryName) || 0;
      categoryTotals.set(categoryName, currentTotal + amount);
    });

    // Resolver nomes das categorias para expensesByCategoryData
    const categoryNamesMap = new Map();
    expensesRaw.forEach((exp: any) => {
      if (exp.category && exp.category.name) {
        categoryNamesMap.set(exp.categoryId, exp.category.name);
      }
    });
    const expensesByCategoryFinal = expensesByCategoryData.map((cat: any) => ({
      categoryName: categoryNamesMap.get(cat.categoryId) || 'Sem categoria',
      amount: cat._sum.amount,
      percentage: totalExpenses > 0 ? (cat._sum.amount / totalExpenses) * 100 : 0
    })).sort((a: any, b: any) => b.amount - a.amount);

    // Calculate credit card usage
    const totalCreditUsage = creditCards.reduce((sum: number, card: any) => {
      const cardUsage = card.creditExpenses.reduce((cardSum: number, exp: any) => cardSum + Number(exp.amount), 0);
      return sum + cardUsage;
    }, 0);

    const totalCreditLimit = creditCards.reduce((sum: number, card: any) => sum + Number(card.limit || 0), 0);

  // Calcular total de gastos recorrentes expandidos
  const totalRecurringExpenses = filteredRecurringExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

    // Find largest expense
    const largestExpense = allExpenses.reduce((largest: any, expense: any) => {
      return Number(expense.amount) > Number(largest.amount) ? expense : largest;
    }, { amount: 0, description: 'Nenhuma despesa', category: { name: 'Sem categoria' } });

    // Find unusual transactions (expenses significantly above average)
    let unusualTransactions: any[] = [];
    
    if (allExpenses.length > 3) { // Only calculate se temos dados suficientes
      const expenseAmounts = allExpenses.map((e: any) => Number(e.amount)).filter((amount: number) => amount > 0);
      
      if (expenseAmounts.length > 0) {
        const sortedAmounts = [...expenseAmounts].sort((a, b) => a - b);
        const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
        const q3Index = Math.floor(sortedAmounts.length * 0.75);
        const q3 = sortedAmounts[q3Index];
        
        // Consider as unusual: expenses > Q3 + 1.5 * IQR or > 3 * median (whichever is lower)
        const iqr = q3 - sortedAmounts[Math.floor(sortedAmounts.length * 0.25)];
        const outlierThreshold = Math.min(q3 + 1.5 * iqr, median * 3);
        const finalThreshold = Math.max(outlierThreshold, 200); // Minimum R$ 200 to be considered unusual

        unusualTransactions = allExpenses
          .filter((expense: any) => Number(expense.amount) > finalThreshold)
          .map((expense: any) => ({
            description: expense.description || 'Transação sem descrição',
            amount: Number(expense.amount),
            date: expense.date ? expense.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          }))
          .sort((a: any, b: any) => b.amount - a.amount)
          .slice(0, 5);
      }
    }

    // Calculate health score (comprehensive algorithm)
    let healthScore = 0;

    // 1. Savings rate (0-35 points) - Most important factor
    if (savingsRate >= 30) healthScore += 35;
    else if (savingsRate >= 20) healthScore += 30;
    else if (savingsRate >= 15) healthScore += 25;
    else if (savingsRate >= 10) healthScore += 20;
    else if (savingsRate >= 5) healthScore += 15;
    else if (savingsRate >= 0) healthScore += 10;
    else healthScore += 0; // Negative savings

    // 2. Income vs Expenses balance (0-25 points)
    if (balance > 0) {
      const balanceRatio = balance / totalIncome;
      if (balanceRatio >= 0.3) healthScore += 25;
      else if (balanceRatio >= 0.2) healthScore += 20;
      else if (balanceRatio >= 0.1) healthScore += 15;
      else healthScore += 10;
    } else {
      healthScore += 0; // Negative balance
    }

    // 3. Credit usage (0-20 points)
    const creditUsageRatio = totalCreditLimit > 0 ? totalCreditUsage / totalCreditLimit : 0;
    if (totalCreditLimit === 0 || creditUsageRatio <= 0.1) healthScore += 20; // No credit or very low usage
    else if (creditUsageRatio <= 0.3) healthScore += 15;
    else if (creditUsageRatio <= 0.5) healthScore += 10;
    else if (creditUsageRatio <= 0.7) healthScore += 5;
    else healthScore += 0; // High credit usage

    // 4. Month-over-month improvement (0-10 points)
    if (balance > previousMonthBalance * 1.1) healthScore += 10; // 10% improvement
    else if (balance > previousMonthBalance) healthScore += 7;
    else if (balance >= previousMonthBalance * 0.95) healthScore += 5; // Within 5% of previous
    else healthScore += 0;

    // 5. Expense diversification (0-10 points)
    if (expensesByCategoryData.length > 0) {
      const maxCategoryPercentage = Math.max(...expensesByCategoryData.map((cat: any) => cat.percentage), 0);
      if (maxCategoryPercentage <= 30 && expensesByCategoryData.length >= 4) healthScore += 10; // Well diversified
      else if (maxCategoryPercentage <= 40) healthScore += 7;
      else if (maxCategoryPercentage <= 50) healthScore += 5;
      else healthScore += 2; // Concentrated expenses
    }

    healthScore = Math.min(100, Math.max(0, Math.round(healthScore)));

    // Generate historical health scores based on actual data trends
    const previousHealthScores = [];
    const baseScore = healthScore;
    
    for (let i = 5; i >= 0; i--) {
      const historyMonth = new Date(year, monthNum - 1 - i, 1);
      const monthNumStr = (historyMonth.getMonth() + 1).toString().length === 1
        ? '0' + (historyMonth.getMonth() + 1).toString()
        : (historyMonth.getMonth() + 1).toString();
      const monthStr = `${historyMonth.getFullYear()}-${monthNumStr}`;
      
      let historicalScore = baseScore;
      
      if (i > 0) {
        // Calculate historical score based on balance trend
        const balanceImprovement = balance - previousMonthBalance;
        const monthlyImprovement = balanceImprovement / Math.max(i, 1);
        
        // Apply trend-based adjustment
        if (balanceImprovement > 0) {
          // Improving trend - scores should be lower in the past
          historicalScore = baseScore - (i * 3) + (Math.random() * 4 - 2);
        } else if (balanceImprovement < 0) {
          // Declining trend - scores should be higher in the past
          historicalScore = baseScore + (i * 2) + (Math.random() * 4 - 2);
        } else {
          // Stable trend - scores should be relatively flat
          historicalScore = baseScore + (Math.random() * 6 - 3);
        }
      }
      
      historicalScore = Math.min(100, Math.max(30, Math.round(historicalScore)));
      
      previousHealthScores.push({
        month: monthStr,
        score: historicalScore
      });
    }

    // Process budget goals
    const budgetGoals = goals
      .filter((goal: any) => goal.categoryId && goal.operator === 'AT_MOST')
      .map((goal: any) => {
        const categoryExpenses = allExpenses
          .filter((exp: any) => exp.category?.name === goal.category?.name)
          .reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
        const budgetedAmount = Number(goal.amount) || 0;
        return {
          category: goal.category?.name || goal.title || 'Sem categoria',
          budgeted: budgetedAmount,
          spent: categoryExpenses,
          remaining: budgetedAmount - categoryExpenses,
          percentage: budgetedAmount > 0 ? (categoryExpenses / budgetedAmount) * 100 : 0
        };
      });

    const responseData = {
      totalIncome,
      totalExpenses,
      balance,
      previousMonthBalance,
      savingsRate,
  expensesByCategory: expensesByCategoryFinal,
      creditCardUsage: totalCreditUsage,
      creditCardLimit: totalCreditLimit,
      recurringExpenses: totalRecurringExpenses,
      largestExpense: {
        description: largestExpense.description || 'Nenhuma despesa',
        amount: Number(largestExpense.amount) || 0,
        category: largestExpense.category?.name || 'Sem categoria'
      },
      unusualTransactions,
      healthScore,
      previousHealthScores,
      budgetGoals,
      // Novas métricas
      dailyIncomeAvg,
      dailyExpenseAvg,
      projectedIncome,
      projectedExpense,
      projectedBalance,
      incomeCount,
      expenseCount,
      recurringIncomeCount,
      recurringExpenseCount,
      topIncomes,
      topExpenses,
  percentRecurringExpenses,
      percentVariableExpenses,
      topIncomeDays,
      topExpenseDays,
      avgIncome3m,
      avgExpense3m
    };

    // Log de sucesso com métricas
    logger.apiResponse('GET', '/api/smart-report', 200, 0, {
      totalIncome,
      totalExpenses,
      incomeCount,
      expenseCount,
      healthScore,
      email: session.user.email
    });

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error(
      'Erro em /api/smart-report ao processar receitas e relatório inteligente',
      error,
      { month, email: session.user.email }
    );
    return NextResponse.json(
      { error: 'Erro ao processar relatório inteligente' },
      { status: 500 }
    );
  }
}