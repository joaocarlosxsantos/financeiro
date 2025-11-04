/**
 * Sistema de Conquistas e Badges
 * 
 * Detecta automaticamente quando usuário atinge marcos e concede badges
 * @module lib/achievements
 */

// Tipos de badges disponíveis (sincronizado com Prisma schema)
export type BadgeType =
  | 'FIRST_SAVINGS'
  | 'SAVINGS_STREAK_7'
  | 'SAVINGS_STREAK_30'
  | 'SAVED_1K'
  | 'SAVED_5K'
  | 'SAVED_10K'
  | 'NO_SPEND_WEEK'
  | 'NO_SPEND_MONTH'
  | 'BUDGET_KEEPER'
  | 'BILL_MASTER'
  | 'FIRST_GOAL'
  | 'GOAL_ACHIEVED'
  | 'GOAL_STREAK_3'
  | 'EMERGENCY_FUND_50'
  | 'EMERGENCY_FUND_100'
  | 'EARLY_BIRD'
  | 'CONSISTENT_USER'
  | 'POWER_USER'
  | 'CATEGORY_MASTER'
  | 'DEBT_FREE'
  | 'INVESTMENT_STARTER'
  | 'YEAR_REVIEW';

export interface BadgeDefinition {
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  // Economia
  FIRST_SAVINGS: {
    type: 'FIRST_SAVINGS',
    title: 'Primeira Economia',
    description: 'Registrou sua primeira economia!',
    icon: '💰',
    color: '#10B981',
    rarity: 'common',
    points: 10,
  },
  SAVINGS_STREAK_7: {
    type: 'SAVINGS_STREAK_7',
    title: 'Economista Semanal',
    description: 'Economizou por 7 dias consecutivos',
    icon: '📈',
    color: '#3B82F6',
    rarity: 'common',
    points: 25,
  },
  SAVINGS_STREAK_30: {
    type: 'SAVINGS_STREAK_30',
    title: 'Economista Mensal',
    description: 'Economizou por 30 dias consecutivos',
    icon: '🔥',
    color: '#F59E0B',
    rarity: 'rare',
    points: 100,
  },
  SAVED_1K: {
    type: 'SAVED_1K',
    title: 'Mil no Bolso',
    description: 'Economizou R$ 1.000',
    icon: '💵',
    color: '#10B981',
    rarity: 'common',
    points: 50,
  },
  SAVED_5K: {
    type: 'SAVED_5K',
    title: 'Poupador Dedicado',
    description: 'Economizou R$ 5.000',
    icon: '💎',
    color: '#3B82F6',
    rarity: 'rare',
    points: 150,
  },
  SAVED_10K: {
    type: 'SAVED_10K',
    title: 'Mestre das Economias',
    description: 'Economizou R$ 10.000',
    icon: '👑',
    color: '#8B5CF6',
    rarity: 'epic',
    points: 300,
  },
  
  // Disciplina
  NO_SPEND_WEEK: {
    type: 'NO_SPEND_WEEK',
    title: 'Semana Disciplinada',
    description: 'Passou 1 semana sem gastar em uma categoria',
    icon: '🎯',
    color: '#10B981',
    rarity: 'common',
    points: 30,
  },
  NO_SPEND_MONTH: {
    type: 'NO_SPEND_MONTH',
    title: 'Mês de Controle',
    description: 'Passou 1 mês sem gastar em uma categoria',
    icon: '🏆',
    color: '#F59E0B',
    rarity: 'rare',
    points: 120,
  },
  BUDGET_KEEPER: {
    type: 'BUDGET_KEEPER',
    title: 'Guardião do Orçamento',
    description: 'Manteve-se no orçamento por 3 meses',
    icon: '🛡️',
    color: '#8B5CF6',
    rarity: 'epic',
    points: 200,
  },
  BILL_MASTER: {
    type: 'BILL_MASTER',
    title: 'Mestre das Contas',
    description: 'Pagou todas as contas em dia por 6 meses',
    icon: '⚡',
    color: '#F59E0B',
    rarity: 'epic',
    points: 250,
  },
  
  // Progresso
  FIRST_GOAL: {
    type: 'FIRST_GOAL',
    title: 'Primeira Meta',
    description: 'Criou sua primeira meta financeira',
    icon: '🎯',
    color: '#3B82F6',
    rarity: 'common',
    points: 15,
  },
  GOAL_ACHIEVED: {
    type: 'GOAL_ACHIEVED',
    title: 'Meta Alcançada',
    description: 'Atingiu uma meta financeira',
    icon: '✨',
    color: '#10B981',
    rarity: 'common',
    points: 40,
  },
  GOAL_STREAK_3: {
    type: 'GOAL_STREAK_3',
    title: 'Sequência de Vitórias',
    description: 'Alcançou 3 metas seguidas',
    icon: '🌟',
    color: '#8B5CF6',
    rarity: 'rare',
    points: 150,
  },
  EMERGENCY_FUND_50: {
    type: 'EMERGENCY_FUND_50',
    title: 'Metade da Reserva',
    description: 'Atingiu 50% da reserva de emergência',
    icon: '🏦',
    color: '#3B82F6',
    rarity: 'rare',
    points: 100,
  },
  EMERGENCY_FUND_100: {
    type: 'EMERGENCY_FUND_100',
    title: 'Reserva Completa',
    description: 'Atingiu 100% da reserva de emergência',
    icon: '💪',
    color: '#10B981',
    rarity: 'epic',
    points: 300,
  },
  
  // Engajamento
  EARLY_BIRD: {
    type: 'EARLY_BIRD',
    title: 'Início Promissor',
    description: 'Usou o app por 7 dias consecutivos',
    icon: '🐣',
    color: '#10B981',
    rarity: 'common',
    points: 20,
  },
  CONSISTENT_USER: {
    type: 'CONSISTENT_USER',
    title: 'Usuário Consistente',
    description: 'Usou o app por 30 dias consecutivos',
    icon: '📱',
    color: '#3B82F6',
    rarity: 'rare',
    points: 100,
  },
  POWER_USER: {
    type: 'POWER_USER',
    title: 'Usuário Avançado',
    description: 'Usou o app por 100 dias consecutivos',
    icon: '⚡',
    color: '#8B5CF6',
    rarity: 'legendary',
    points: 500,
  },
  CATEGORY_MASTER: {
    type: 'CATEGORY_MASTER',
    title: 'Mestre da Organização',
    description: 'Categorizou 100 transações',
    icon: '📊',
    color: '#F59E0B',
    rarity: 'rare',
    points: 80,
  },
  
  // Especiais
  DEBT_FREE: {
    type: 'DEBT_FREE',
    title: 'Livre de Dívidas',
    description: 'Quitou todas as dívidas',
    icon: '🎉',
    color: '#10B981',
    rarity: 'legendary',
    points: 1000,
  },
  INVESTMENT_STARTER: {
    type: 'INVESTMENT_STARTER',
    title: 'Investidor Iniciante',
    description: 'Registrou seu primeiro investimento',
    icon: '📈',
    color: '#3B82F6',
    rarity: 'rare',
    points: 150,
  },
  YEAR_REVIEW: {
    type: 'YEAR_REVIEW',
    title: 'Um Ano de Conquistas',
    description: 'Completou 1 ano usando o app',
    icon: '🎂',
    color: '#8B5CF6',
    rarity: 'legendary',
    points: 500,
  },
};

/**
 * Calcula o nível baseado nos pontos
 */
export function calculateLevel(points: number): number {
  // Sistema: 100 pontos por nível, progressão linear
  return Math.floor(points / 100) + 1;
}

/**
 * Calcula pontos necessários para próximo nível
 */
export function pointsToNextLevel(currentPoints: number): number {
  const currentLevel = calculateLevel(currentPoints);
  const pointsForNextLevel = currentLevel * 100;
  return pointsForNextLevel - currentPoints;
}

/**
 * Retorna cor baseada na raridade
 */
export function getRarityColor(rarity: BadgeDefinition['rarity']): string {
  const colors = {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B',
  };
  return colors[rarity];
}

/**
 * Agrupa badges por raridade
 */
export function groupBadgesByRarity(badges: BadgeType[]): Record<string, BadgeType[]> {
  return badges.reduce((acc, badge) => {
    const rarity = BADGE_DEFINITIONS[badge].rarity;
    if (!acc[rarity]) acc[rarity] = [];
    acc[rarity].push(badge);
    return acc;
  }, {} as Record<string, BadgeType[]>);
}
