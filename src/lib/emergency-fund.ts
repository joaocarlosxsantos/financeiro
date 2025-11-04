/**
 * Sistema de Reserva de Emergência Inteligente
 * 
 * Calcula reserva ideal e sugere contribuições mensais
 * @module lib/emergency-fund
 */

export interface EmergencyFundData {
  currentAmount: number;
  targetAmount: number;
  monthsOfExpenses: number;
  percentageComplete: number;
  monthlyExpensesAverage: number;
  suggestedMonthlyContribution: number;
  monthsToComplete: number;
  status: 'none' | 'started' | 'halfway' | 'complete' | 'excellent';
}

export interface EmergencyFundSuggestion {
  title: string;
  description: string;
  amount: number;
  timeline: number; // meses para completar
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Calcula a reserva de emergência ideal
 * @param monthlyExpenses Média de despesas mensais
 * @param targetMonths Quantidade de meses desejada (padrão: 6)
 */
export function calculateEmergencyFund(
  totalSavings: number,
  monthlyExpenses: number,
  targetMonths: number = 6
): EmergencyFundData {
  const targetAmount = monthlyExpenses * targetMonths;
  const percentageComplete = targetAmount > 0 ? (totalSavings / targetAmount) * 100 : 0;

  // Define status baseado no progresso
  let status: EmergencyFundData['status'] = 'none';
  if (percentageComplete === 0) status = 'none';
  else if (percentageComplete < 25) status = 'started';
  else if (percentageComplete < 100) status = 'halfway';
  else if (percentageComplete >= 100 && percentageComplete < 200) status = 'complete';
  else status = 'excellent';

  // Calcula contribuição sugerida (meta: completar em 12-24 meses)
  const remainingAmount = Math.max(0, targetAmount - totalSavings);
  const suggestedTimeline = 18; // 18 meses para completar
  const suggestedMonthlyContribution = remainingAmount / suggestedTimeline;

  // Calcula meses para completar com contribuição sugerida
  const monthsToComplete = suggestedMonthlyContribution > 0 
    ? Math.ceil(remainingAmount / suggestedMonthlyContribution)
    : Infinity;

  return {
    currentAmount: totalSavings,
    targetAmount,
    monthsOfExpenses: targetMonths,
    percentageComplete: Math.min(percentageComplete, 200), // Cap em 200%
    monthlyExpensesAverage: monthlyExpenses,
    suggestedMonthlyContribution,
    monthsToComplete: isFinite(monthsToComplete) ? monthsToComplete : 0,
    status,
  };
}

/**
 * Gera sugestões personalizadas de contribuição
 */
export function generateContributionSuggestions(
  remainingAmount: number,
  monthlyIncome: number,
  monthlyExpenses: number
): EmergencyFundSuggestion[] {
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const suggestions: EmergencyFundSuggestion[] = [];

  // Sugestão Conservadora (5% da renda)
  const conservative = monthlyIncome * 0.05;
  suggestions.push({
    title: 'Conservadora',
    description: 'Apenas 5% da sua renda mensal',
    amount: conservative,
    timeline: Math.ceil(remainingAmount / conservative),
    priority: 'low',
  });

  // Sugestão Equilibrada (10-15% da renda)
  const balanced = monthlyIncome * 0.125;
  suggestions.push({
    title: 'Equilibrada',
    description: '12,5% da sua renda - recomendada',
    amount: balanced,
    timeline: Math.ceil(remainingAmount / balanced),
    priority: 'medium',
  });

  // Sugestão Agressiva (20% da renda ou 50% do disponível)
  const aggressive = Math.min(monthlyIncome * 0.20, disposableIncome * 0.5);
  if (aggressive > 0) {
    suggestions.push({
      title: 'Agressiva',
      description: 'Complete sua reserva mais rápido',
      amount: aggressive,
      timeline: Math.ceil(remainingAmount / aggressive),
      priority: 'high',
    });
  }

  // Sugestão Urgente (se não tem reserva)
  if (remainingAmount > monthlyExpenses * 5) {
    const urgent = Math.min(monthlyIncome * 0.30, disposableIncome * 0.7);
    if (urgent > 0) {
      suggestions.push({
        title: 'Prioridade Máxima',
        description: 'Construa sua proteção rapidamente',
        amount: urgent,
        timeline: Math.ceil(remainingAmount / urgent),
        priority: 'urgent',
      });
    }
  }

  return suggestions.filter(s => s.amount > 0 && isFinite(s.timeline));
}

/**
 * Retorna dicas baseadas no status da reserva
 */
export function getEmergencyFundTips(status: EmergencyFundData['status']): string[] {
  const tips: Record<EmergencyFundData['status'], string[]> = {
    none: [
      'Comece hoje mesmo! Mesmo R$ 50/mês faz diferença.',
      'Abra uma conta separada só para emergências.',
      'Automatize transferências mensais.',
      'Trate a reserva como uma conta obrigatória.',
    ],
    started: [
      'Continue firme! Você já deu o primeiro passo.',
      'Redirecione 50% de qualquer renda extra.',
      'Evite resgates desnecessários.',
      'Comemore pequenas conquistas.',
    ],
    halfway: [
      'Você está na metade do caminho!',
      'Mantenha a disciplina, falta pouco.',
      'Revise seu orçamento para acelerar.',
      'Considere aumentar a contribuição mensal.',
    ],
    complete: [
      'Parabéns! Sua reserva está completa.',
      'Considere expandir para 12 meses.',
      'Mantenha-se longe de investimentos de risco.',
      'Use apenas em verdadeiras emergências.',
    ],
    excellent: [
      'Excelente! Você tem mais de 6 meses guardados.',
      'Sua segurança financeira está garantida.',
      'Considere investir o excedente.',
      'Você é exemplo de disciplina financeira!',
    ],
  };

  return tips[status] || [];
}

/**
 * Calcula o nível de risco baseado na reserva
 */
export function calculateRiskLevel(
  percentageComplete: number
): { level: string; color: string; description: string } {
  if (percentageComplete === 0) {
    return {
      level: 'Crítico',
      color: 'text-red-500',
      description: 'Sem proteção financeira',
    };
  }
  
  if (percentageComplete < 25) {
    return {
      level: 'Alto',
      color: 'text-orange-500',
      description: 'Proteção muito limitada',
    };
  }
  
  if (percentageComplete < 50) {
    return {
      level: 'Moderado',
      color: 'text-yellow-500',
      description: 'Proteção parcial',
    };
  }
  
  if (percentageComplete < 100) {
    return {
      level: 'Baixo',
      color: 'text-blue-500',
      description: 'Boa proteção',
    };
  }
  
  return {
    level: 'Muito Baixo',
    color: 'text-green-500',
    description: 'Excelente proteção',
  };
}

/**
 * Retorna marcos (milestones) da reserva
 */
export function getEmergencyFundMilestones(
  targetAmount: number
): Array<{ amount: number; label: string; percentage: number }> {
  return [
    { amount: targetAmount * 0.25, label: '3 meses', percentage: 25 },
    { amount: targetAmount * 0.50, label: '6 meses', percentage: 50 },
    { amount: targetAmount * 0.75, label: '9 meses', percentage: 75 },
    { amount: targetAmount, label: '12 meses', percentage: 100 },
  ];
}
