/**
 * Simulador de Cenários Financeiros
 * 
 * Sistema para criar e comparar múltiplos cenários "what-if"
 * @module lib/scenario-simulator
 */

export interface ScenarioParameters {
  id: string;
  name: string;
  description?: string;
  duration: number; // meses
  
  // Parâmetros de entrada
  initialBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  
  // Mudanças propostas
  incomeChange?: number; // mudança percentual na renda
  expensesChange?: number; // mudança percentual nas despesas
  savingsChange?: number; // mudança no valor poupado
  oneTimeExpense?: number; // gasto único (ex: compra grande)
  oneTimeExpenseMonth?: number; // em qual mês
  oneTimeIncome?: number; // renda extra única
  oneTimeIncomeMonth?: number;
  
  // Parâmetros opcionais
  inflation?: number; // taxa de inflação mensal
  investmentReturn?: number; // retorno de investimento mensal
  
  color?: string;
}

export interface ScenarioResult {
  id: string;
  name: string;
  monthlyData: MonthlyProjection[];
  summary: ScenarioSummary;
  color: string;
}

export interface MonthlyProjection {
  month: number;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  invested: number;
}

export interface ScenarioSummary {
  finalBalance: number;
  totalSaved: number;
  totalIncome: number;
  totalExpenses: number;
  averageMonthlyBalance: number;
  lowestBalance: number;
  highestBalance: number;
  savingsRate: number;
}

/**
 * Simula um cenário financeiro
 */
export function simulateScenario(params: ScenarioParameters): ScenarioResult {
  const monthlyData: MonthlyProjection[] = [];
  let currentBalance = params.initialBalance;
  let investedAmount = 0;
  
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalSaved = 0;
  let lowestBalance = currentBalance;
  let highestBalance = currentBalance;
  let balanceSum = 0;

  for (let month = 1; month <= params.duration; month++) {
    // Aplica mudanças propostas
    const income = params.monthlyIncome * (1 + (params.incomeChange || 0) / 100);
    const expenses = params.monthlyExpenses * (1 + (params.expensesChange || 0) / 100);
    const savings = params.monthlySavings + (params.savingsChange || 0);
    
    // Adiciona eventos únicos
    let monthIncome = income;
    let monthExpenses = expenses;
    
    if (params.oneTimeIncome && month === params.oneTimeIncomeMonth) {
      monthIncome += params.oneTimeIncome;
    }
    
    if (params.oneTimeExpense && month === params.oneTimeExpenseMonth) {
      monthExpenses += params.oneTimeExpense;
    }
    
    // Aplica inflação
    if (params.inflation) {
      const inflationFactor = Math.pow(1 + params.inflation / 100, month);
      monthExpenses *= inflationFactor;
    }
    
    // Calcula novo saldo
    const netChange = monthIncome - monthExpenses;
    currentBalance += netChange;
    
    // Investe a economia mensal
    if (savings > 0) {
      investedAmount += savings;
      
      // Aplica retorno de investimento
      if (params.investmentReturn) {
        investedAmount *= (1 + params.investmentReturn / 100);
      }
    }
    
    // Atualiza estatísticas
    totalIncome += monthIncome;
    totalExpenses += monthExpenses;
    totalSaved += savings;
    balanceSum += currentBalance;
    lowestBalance = Math.min(lowestBalance, currentBalance);
    highestBalance = Math.max(highestBalance, currentBalance);
    
    monthlyData.push({
      month,
      income: monthIncome,
      expenses: monthExpenses,
      savings,
      balance: currentBalance,
      invested: investedAmount,
    });
  }

  const summary: ScenarioSummary = {
    finalBalance: currentBalance + investedAmount,
    totalSaved,
    totalIncome,
    totalExpenses,
    averageMonthlyBalance: balanceSum / params.duration,
    lowestBalance,
    highestBalance,
    savingsRate: totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0,
  };

  return {
    id: params.id,
    name: params.name,
    monthlyData,
    summary,
    color: params.color || '#3B82F6',
  };
}

/**
 * Compara múltiplos cenários
 */
export function compareScenarios(results: ScenarioResult[]): {
  best: ScenarioResult;
  worst: ScenarioResult;
  differences: Record<string, number>;
} {
  if (results.length === 0) {
    throw new Error('No scenarios to compare');
  }

  const sorted = [...results].sort((a, b) => 
    b.summary.finalBalance - a.summary.finalBalance
  );

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  
  const differences = {
    finalBalance: best.summary.finalBalance - worst.summary.finalBalance,
    totalSaved: best.summary.totalSaved - worst.summary.totalSaved,
    savingsRate: best.summary.savingsRate - worst.summary.savingsRate,
  };

  return { best, worst, differences };
}

/**
 * Templates de cenários pré-definidos
 */
export function getScenarioTemplates(
  currentBalance: number,
  monthlyIncome: number,
  monthlyExpenses: number
): Partial<ScenarioParameters>[] {
  const monthlySavings = monthlyIncome - monthlyExpenses;
  
  return [
    {
      name: 'Cenário Atual',
      description: 'Mantendo tudo como está',
      incomeChange: 0,
      expensesChange: 0,
      savingsChange: 0,
      color: '#3B82F6',
    },
    {
      name: 'Economize 10%',
      description: 'Reduza despesas em 10%',
      incomeChange: 0,
      expensesChange: -10,
      savingsChange: monthlyExpenses * 0.1,
      color: '#10B981',
    },
    {
      name: 'Economize 20%',
      description: 'Reduza despesas em 20%',
      incomeChange: 0,
      expensesChange: -20,
      savingsChange: monthlyExpenses * 0.2,
      color: '#059669',
    },
    {
      name: 'Aumento de Renda (+20%)',
      description: 'Com promoção ou renda extra',
      incomeChange: 20,
      expensesChange: 0,
      savingsChange: monthlyIncome * 0.2,
      color: '#8B5CF6',
    },
    {
      name: 'Emergência Financeira',
      description: 'Gasto inesperado de R$ 5.000',
      incomeChange: 0,
      expensesChange: 0,
      savingsChange: 0,
      oneTimeExpense: 5000,
      oneTimeExpenseMonth: 3,
      color: '#EF4444',
    },
    {
      name: 'Investimentos',
      description: 'Economize e invista com retorno',
      incomeChange: 0,
      expensesChange: -15,
      savingsChange: monthlyExpenses * 0.15,
      investmentReturn: 1, // 1% ao mês
      color: '#F59E0B',
    },
  ];
}

/**
 * Calcula ponto de break-even (quando saldo zera)
 */
export function calculateBreakEven(result: ScenarioResult): number | null {
  for (let i = 0; i < result.monthlyData.length; i++) {
    if (result.monthlyData[i].balance <= 0) {
      return i + 1; // retorna o mês
    }
  }
  return null; // não zerará no período
}

/**
 * Calcula quando atingirá uma meta
 */
export function calculateGoalReach(
  result: ScenarioResult,
  goalAmount: number
): number | null {
  for (let i = 0; i < result.monthlyData.length; i++) {
    if (result.monthlyData[i].balance >= goalAmount) {
      return i + 1;
    }
  }
  return null;
}
