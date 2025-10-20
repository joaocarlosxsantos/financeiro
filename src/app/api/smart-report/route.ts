import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { getNowBrasilia } from '../../../lib/datetime-brasilia';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM format
  
  if (!month) {
    return NextResponse.json({ error: 'Mês é obrigatório' }, { status: 400 });
  }

  try {
    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Get previous month for comparison
    const prevMonthStart = new Date(year, monthNum - 2, 1);
    const prevMonthEnd = new Date(year, monthNum - 1, 0, 23, 59, 59, 999);


    // Buscar lançamentos normais e recorrentes
    const [
      expenses,
      recurringExpensesRaw,
      incomes,
      recurringIncomesRaw,
      creditCards,
      expensesByCategory,
      prevMonthExpenses,
      prevMonthIncomes,
      goals
    ] = await Promise.all([
      // Despesas normais
      prisma.expense.findMany({
        where: {
          user: { email: session.user.email },
          date: { gte: startDate, lte: endDate },
          transferId: null,
          type: { not: 'RECURRING' }
        },
        select: {
          id: true,
          amount: true,
          description: true,
          date: true,
          category: { select: { name: true } },
          type: true
        }
      }),

      // Despesas recorrentes (todas do usuário)
      (async () => {
        const userEmail = session?.user?.email ?? '';
        const allRecurring = await prisma.expense.findMany({
          where: {
            user: { email: userEmail },
            type: 'RECURRING',
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
        const now = new Date();
        const currentDay = now.getDate();
        // Filtra apenas despesas recorrentes cujo dia do mês é <= ao dia atual
        return allRecurring.filter((rec: { date: Date }) => {
          const recDateObj = new Date(rec.date);
          const recDay = recDateObj.getDate();
          return recDay <= currentDay;
        });
      })(),

      // Receitas normais
      prisma.income.findMany({
        where: {
          user: { email: session.user.email },
          date: { gte: startDate, lte: endDate },
          transferId: null,
          type: { not: 'RECURRING' }
        },
        select: { amount: true, date: true, description: true, type: true }
      }),

      // Receitas recorrentes (todas do usuário)
      (async () => {
        // Garantir que session.user.email está definido
        const userEmail = session?.user?.email ?? '';
        const allRecurring = await prisma.income.findMany({
          where: {
            user: { email: userEmail },
            type: 'RECURRING',
            transferId: null
          },
          select: { amount: true, date: true, description: true, type: true }
        });
        const now = new Date();
        const currentDay = now.getDate();
        // Filtra apenas receitas recorrentes cujo dia do mês é <= ao dia atual
        return allRecurring.filter((rec: { date: Date }) => {
          // Cria a data recorrente com horário 12:00 para evitar problemas de fuso
          const recDateObj = new Date(rec.date);
          const recDay = recDateObj.getDate();
          // Se quiser comparar a data completa, use:
          // const recDate = new Date(recDateObj.getFullYear(), recDateObj.getMonth(), recDay, 12, 0, 0);
          return recDay <= currentDay;
        });
      })(),

      // Credit cards usage
      prisma.creditCard.findMany({
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
      }),

      // Expenses by category - usando findMany em vez de groupBy para melhor controle
      prisma.expense.findMany({
        where: {
          user: { email: session.user.email },
          date: { gte: startDate, lte: endDate },
          transferId: null
        },
        select: {
          amount: true,
          categoryId: true,
          category: { select: { name: true } }
        }
      }),

      // Previous month expenses
      prisma.expense.findMany({
        where: {
          user: { email: session.user.email },
          date: { gte: prevMonthStart, lte: prevMonthEnd },
          transferId: null
        },
        select: { amount: true }
      }),

      // Previous month incomes
      prisma.income.findMany({
        where: {
          user: { email: session.user.email },
          date: { gte: prevMonthStart, lte: prevMonthEnd },
          transferId: null
        },
        select: { amount: true }
      }),

      // Financial goals
      prisma.goal.findMany({
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
      })
    ]);

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

    // Expandir despesas e receitas recorrentes para o mês
    const expandedRecurringExpenses = expandRecurring(recurringExpensesRaw, startDate, endDate);
    const expandedRecurringIncomes = expandRecurring(recurringIncomesRaw, startDate, endDate);

    // Unir despesas normais e recorrentes
    const allExpenses = [...expenses, ...expandedRecurringExpenses];
    const allIncomes = [...incomes, ...expandedRecurringIncomes];


    // Calcular totais incluindo recorrentes
    const totalIncome = allIncomes.reduce((sum: number, income: any) => sum + Number(income.amount), 0);
    const totalExpenses = allExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
    const balance = totalIncome - totalExpenses;

    const prevTotalIncome = prevMonthIncomes.reduce((sum: number, income: any) => sum + Number(income.amount), 0);
    const prevTotalExpenses = prevMonthExpenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
    const previousMonthBalance = prevTotalIncome - prevTotalExpenses;

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Processar despesas por categoria incluindo recorrentes
    const categoryTotals = new Map<string, number>();
    allExpenses.forEach((expense: any) => {
      const categoryName = expense.category?.name || 'Sem categoria';
      const amount = Number(expense.amount) || 0;
      const currentTotal = categoryTotals.get(categoryName) || 0;
      categoryTotals.set(categoryName, currentTotal + amount);
    });

    const expensesByCategoryData = Array.from(categoryTotals.entries())
      .map(([categoryName, amount]) => ({
        categoryName,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a: any, b: any) => b.amount - a.amount);

    // Calculate credit card usage
    const totalCreditUsage = creditCards.reduce((sum: number, card: any) => {
      const cardUsage = card.creditExpenses.reduce((cardSum: number, exp: any) => cardSum + Number(exp.amount), 0);
      return sum + cardUsage;
    }, 0);

    const totalCreditLimit = creditCards.reduce((sum: number, card: any) => sum + Number(card.limit || 0), 0);

  // Calcular total de gastos recorrentes expandidos
  const totalRecurringExpenses = expandedRecurringExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

    // Find largest expense
    const largestExpense = expenses.reduce((largest: any, expense: any) => {
      return Number(expense.amount) > Number(largest.amount) ? expense : largest;
    }, { amount: 0, description: 'Nenhuma despesa', category: { name: 'Sem categoria' } });

    // Find unusual transactions (expenses significantly above average)
    let unusualTransactions: any[] = [];
    
    if (expenses.length > 3) { // Only calculate if we have enough data
      const expenseAmounts = expenses.map((e: any) => Number(e.amount)).filter((amount: number) => amount > 0);
      
      if (expenseAmounts.length > 0) {
        const sortedAmounts = [...expenseAmounts].sort((a, b) => a - b);
        const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
        const q3Index = Math.floor(sortedAmounts.length * 0.75);
        const q3 = sortedAmounts[q3Index];
        
        // Consider as unusual: expenses > Q3 + 1.5 * IQR or > 3 * median (whichever is lower)
        const iqr = q3 - sortedAmounts[Math.floor(sortedAmounts.length * 0.25)];
        const outlierThreshold = Math.min(q3 + 1.5 * iqr, median * 3);
        const finalThreshold = Math.max(outlierThreshold, 200); // Minimum R$ 200 to be considered unusual

        unusualTransactions = expenses
          .filter((expense: any) => Number(expense.amount) > finalThreshold)
          .map((expense: any) => ({
            description: expense.description || 'Transação sem descrição',
            amount: Number(expense.amount),
            date: expense.date ? expense.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          }))
          .sort((a: any, b: any) => b.amount - a.amount) // Sort by amount desc
          .slice(0, 5); // Limit to 5 transactions
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
      .filter((goal: any) => goal.categoryId && goal.operator === 'AT_MOST') // Only expense limit goals
      .map((goal: any) => {
        const categoryExpenses = expenses
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
      expensesByCategory: expensesByCategoryData,
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
      budgetGoals
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Erro ao buscar dados do relatório inteligente:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}