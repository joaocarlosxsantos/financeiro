/**
 * Sistema de Alertas Inteligentes
 * 
 * Detecta padrões anormais nos gastos e gera alertas automáticos
 * baseados em análise histórica e comparações com comportamento anterior.
 * 
 * @module lib/smart-alerts
 */

export interface AlertRule {
  id: string;
  type: 'spending_spike' | 'budget_exceeded' | 'unusual_category' | 'savings_drop' | 'recurring_missed';
  severity: 'critical' | 'warning' | 'info';
  threshold: number;
  message: (data: any) => string;
  action: (data: any) => string;
}

export interface Alert {
  id: string;
  type: AlertRule['type'];
  severity: AlertRule['severity'];
  title: string;
  message: string;
  action: string;
  timestamp: Date;
  data?: any;
}

/**
 * Regras de alertas configuradas
 */
const ALERT_RULES: AlertRule[] = [
  {
    id: 'spending_spike',
    type: 'spending_spike',
    severity: 'warning',
    threshold: 30, // 30% acima da média
    message: (data) => 
      `Seus gastos totais estão ${data.percentageAbove.toFixed(0)}% acima da sua média mensal (R$ ${data.average.toFixed(2)}).`,
    action: (data) => 
      `Revise suas transações recentes e identifique gastos não planejados.`,
  },
  {
    id: 'category_spike',
    type: 'unusual_category',
    severity: 'warning',
    threshold: 50, // 50% acima da média da categoria
    message: (data) => 
      `Gastos em "${data.category}" estão ${data.percentageAbove.toFixed(0)}% acima do normal (média: R$ ${data.average.toFixed(2)}).`,
    action: (data) => 
      `Analise transações em ${data.category} e considere ajustes.`,
  },
  {
    id: 'budget_exceeded',
    type: 'budget_exceeded',
    severity: 'critical',
    threshold: 90, // 90% do orçamento usado
    message: (data) => 
      `Você já usou ${data.percentageUsed.toFixed(0)}% do orçamento de "${data.category}" (R$ ${data.spent.toFixed(2)} de R$ ${data.budget.toFixed(2)}).`,
    action: (data) => 
      `Reduza gastos em ${data.category} para não estourar o orçamento até o fim do mês.`,
  },
  {
    id: 'savings_drop',
    type: 'savings_drop',
    severity: 'critical',
    threshold: -20, // Queda de 20% na taxa de poupança
    message: (data) => 
      `Sua taxa de poupança caiu de ${data.previousRate.toFixed(1)}% para ${data.currentRate.toFixed(1)}%.`,
    action: (data) => 
      `Identifique o que mudou e ajuste seus gastos para recuperar sua capacidade de poupar.`,
  },
  {
    id: 'recurring_unusual',
    type: 'recurring_missed',
    severity: 'info',
    threshold: 0,
    message: (data) => 
      `A despesa recorrente "${data.description}" não foi detectada este mês.`,
    action: (data) => 
      `Verifique se esqueceu de registrar ou se cancelou este serviço.`,
  },
];

/**
 * Detecta anomalias em gastos totais
 */
export function detectSpendingAnomaly(
  currentExpenses: number,
  historicalExpenses: number[] // Últimos 3-6 meses
): Alert | null {
  if (historicalExpenses.length < 2) return null;

  const average = historicalExpenses.reduce((sum, val) => sum + val, 0) / historicalExpenses.length;
  const percentageAbove = ((currentExpenses - average) / average) * 100;

  const rule = ALERT_RULES.find(r => r.id === 'spending_spike');
  if (!rule) return null;

  if (percentageAbove > rule.threshold) {
    return {
      id: `spike_${Date.now()}`,
      type: 'spending_spike',
      severity: 'warning',
      title: '📊 Gastos acima do normal',
      message: rule.message({ percentageAbove, average, current: currentExpenses }),
      action: rule.action({ percentageAbove, average }),
      timestamp: new Date(),
      data: { percentageAbove, average, current: currentExpenses },
    };
  }

  return null;
}

/**
 * Detecta anomalias em categorias específicas
 */
export function detectCategoryAnomaly(
  category: string,
  currentAmount: number,
  historicalAmounts: number[] // Últimos 3-6 meses
): Alert | null {
  if (historicalAmounts.length < 2) return null;

  const average = historicalAmounts.reduce((sum, val) => sum + val, 0) / historicalAmounts.length;
  
  // Ignorar categorias com valores muito pequenos
  if (average < 50) return null;

  const percentageAbove = ((currentAmount - average) / average) * 100;

  const rule = ALERT_RULES.find(r => r.id === 'category_spike');
  if (!rule) return null;

  if (percentageAbove > rule.threshold) {
    return {
      id: `cat_${category}_${Date.now()}`,
      type: 'unusual_category',
      severity: 'warning',
      title: `⚠️ ${category} cresceu muito`,
      message: rule.message({ category, percentageAbove, average }),
      action: rule.action({ category }),
      timestamp: new Date(),
      data: { category, percentageAbove, average, current: currentAmount },
    };
  }

  return null;
}

/**
 * Detecta orçamento sendo estourado
 */
export function detectBudgetExceeded(
  category: string,
  spent: number,
  budget: number
): Alert | null {
  const percentageUsed = (spent / budget) * 100;

  const rule = ALERT_RULES.find(r => r.id === 'budget_exceeded');
  if (!rule) return null;

  if (percentageUsed >= rule.threshold) {
    return {
      id: `budget_${category}_${Date.now()}`,
      type: 'budget_exceeded',
      severity: percentageUsed >= 100 ? 'critical' : 'warning',
      title: percentageUsed >= 100 ? '🚨 Orçamento estourado!' : '⚠️ Orçamento quase estourado',
      message: rule.message({ category, percentageUsed, spent, budget }),
      action: rule.action({ category }),
      timestamp: new Date(),
      data: { category, percentageUsed, spent, budget },
    };
  }

  return null;
}

/**
 * Detecta queda na taxa de poupança
 */
export function detectSavingsDrop(
  currentRate: number,
  previousRate: number
): Alert | null {
  const drop = currentRate - previousRate;

  const rule = ALERT_RULES.find(r => r.id === 'savings_drop');
  if (!rule) return null;

  // Só alertar se a queda for significativa
  if (drop < rule.threshold && Math.abs(drop) > 5) {
    return {
      id: `savings_${Date.now()}`,
      type: 'savings_drop',
      severity: 'critical',
      title: '📉 Taxa de poupança caindo',
      message: rule.message({ currentRate, previousRate, drop }),
      action: rule.action({ drop }),
      timestamp: new Date(),
      data: { currentRate, previousRate, drop },
    };
  }

  return null;
}

/**
 * Detecta despesas recorrentes não registradas
 */
export function detectMissingRecurring(
  expectedRecurring: Array<{ description: string; amount: number }>,
  currentExpenses: Array<{ description: string; amount: number }>
): Alert[] {
  const alerts: Alert[] = [];
  const rule = ALERT_RULES.find(r => r.id === 'recurring_unusual');
  if (!rule) return alerts;

  for (const expected of expectedRecurring) {
    const found = currentExpenses.some(exp => 
      exp.description.toLowerCase().includes(expected.description.toLowerCase()) ||
      Math.abs(exp.amount - expected.amount) < 5 // Margem de R$ 5
    );

    if (!found) {
      alerts.push({
        id: `recurring_${expected.description}_${Date.now()}`,
        type: 'recurring_missed',
        severity: 'info',
        title: '🔄 Despesa recorrente não detectada',
        message: rule.message({ description: expected.description }),
        action: rule.action({ description: expected.description }),
        timestamp: new Date(),
        data: { expected },
      });
    }
  }

  return alerts;
}

/**
 * Analisa todos os alertas disponíveis e retorna os mais relevantes
 */
export function generateAllAlerts(data: {
  currentExpenses: number;
  historicalExpenses: number[];
  currentSavingsRate: number;
  previousSavingsRate: number;
  categories: Array<{
    name: string;
    current: number;
    historical: number[];
    budget?: number;
  }>;
  recurringExpenses?: Array<{ description: string; amount: number }>;
  currentTransactions?: Array<{ description: string; amount: number }>;
}): Alert[] {
  const alerts: Alert[] = [];

  // 1. Alerta de gastos totais
  const spendingAlert = detectSpendingAnomaly(
    data.currentExpenses,
    data.historicalExpenses
  );
  if (spendingAlert) alerts.push(spendingAlert);

  // 2. Alertas de categorias
  for (const cat of data.categories) {
    const catAlert = detectCategoryAnomaly(
      cat.name,
      cat.current,
      cat.historical
    );
    if (catAlert) alerts.push(catAlert);

    // 3. Alertas de orçamento
    if (cat.budget) {
      const budgetAlert = detectBudgetExceeded(
        cat.name,
        cat.current,
        cat.budget
      );
      if (budgetAlert) alerts.push(budgetAlert);
    }
  }

  // 4. Alerta de queda na poupança
  const savingsAlert = detectSavingsDrop(
    data.currentSavingsRate,
    data.previousSavingsRate
  );
  if (savingsAlert) alerts.push(savingsAlert);

  // 5. Alertas de despesas recorrentes (se disponível)
  if (data.recurringExpenses && data.currentTransactions) {
    const recurringAlerts = detectMissingRecurring(
      data.recurringExpenses,
      data.currentTransactions
    );
    alerts.push(...recurringAlerts);
  }

  // Ordenar por severidade (critical > warning > info)
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 3, warning: 2, info: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}
