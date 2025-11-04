/**
 * Desafios Financeiros Pré-definidos
 * 
 * Templates de desafios prontos para usar
 * @module lib/challenge-templates
 */

export interface ChallengeTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  goal: number;
  duration: number; // em dias
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  reward: string;
  icon: string;
  category?: string;
  tips: string[];
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Desafios de Economia
  {
    id: 'save-100-week',
    type: 'SAVINGS',
    title: 'Economize R$ 100 esta semana',
    description: 'Guarde R$ 100 nos próximos 7 dias',
    goal: 100,
    duration: 7,
    difficulty: 'EASY',
    reward: 'Badge "Poupador Iniciante"',
    icon: '💰',
    tips: [
      'Prepare refeições em casa',
      'Evite compras por impulso',
      'Use transporte público quando possível',
    ],
  },
  {
    id: 'save-500-month',
    type: 'SAVINGS',
    title: 'Meta de R$ 500 no mês',
    description: 'Economize R$ 500 até o final do mês',
    goal: 500,
    duration: 30,
    difficulty: 'MEDIUM',
    reward: 'Badge "Economista Dedicado" + 100 pontos',
    icon: '🎯',
    tips: [
      'Defina um valor diário (R$ 16,67/dia)',
      'Cancele assinaturas não usadas',
      'Compare preços antes de comprar',
    ],
  },
  {
    id: 'save-1000-month',
    type: 'SAVINGS',
    title: 'Desafio Mil no Mês',
    description: 'Economize R$ 1.000 em 30 dias',
    goal: 1000,
    duration: 30,
    difficulty: 'HARD',
    reward: 'Badge "Mestre Poupador" + 250 pontos',
    icon: '💎',
    tips: [
      'Crie um orçamento rigoroso',
      'Evite gastos com entretenimento',
      'Negocie contas e serviços',
      'Busque renda extra',
    ],
  },

  // Desafios de Não Gastar
  {
    id: 'no-food-delivery-week',
    type: 'NO_SPEND',
    title: 'Semana Sem Delivery',
    description: 'Passe 7 dias sem pedir comida por aplicativo',
    goal: 7,
    duration: 7,
    difficulty: 'EASY',
    reward: 'Badge "Chef Caseiro"',
    icon: '🍳',
    category: 'Alimentação',
    tips: [
      'Planeje suas refeições da semana',
      'Faça um estoque de ingredientes',
      'Aprenda 3 receitas simples',
    ],
  },
  {
    id: 'no-coffee-shop-week',
    type: 'NO_SPEND',
    title: 'Café em Casa',
    description: 'Uma semana sem comprar café fora',
    goal: 7,
    duration: 7,
    difficulty: 'EASY',
    reward: '50 pontos',
    icon: '☕',
    category: 'Alimentação',
    tips: [
      'Prepare café em casa pela manhã',
      'Use garrafa térmica',
      'Calcule quanto está economizando',
    ],
  },
  {
    id: 'no-shopping-month',
    type: 'NO_SPEND',
    title: 'Mês Sem Compras',
    description: '30 dias sem comprar roupas ou acessórios',
    goal: 30,
    duration: 30,
    difficulty: 'MEDIUM',
    reward: 'Badge "Minimalista" + 150 pontos',
    icon: '👕',
    category: 'Vestuário',
    tips: [
      'Reorganize seu guarda-roupa',
      'Crie looks com o que já tem',
      'Desinstale apps de compras',
      'Liste o que realmente precisa',
    ],
  },
  {
    id: 'no-impulse-week',
    type: 'NO_SPEND',
    title: 'Zero Impulso',
    description: '7 dias sem compras por impulso',
    goal: 7,
    duration: 7,
    difficulty: 'MEDIUM',
    reward: '100 pontos',
    icon: '🛑',
    tips: [
      'Espere 24h antes de comprar',
      'Liste suas necessidades reais',
      'Evite shoppings e marketplaces',
    ],
  },

  // Desafios de Controle de Gastos
  {
    id: 'budget-limit-food-week',
    type: 'BUDGET_LIMIT',
    title: 'R$ 200 em Alimentação',
    description: 'Gaste no máximo R$ 200 com comida esta semana',
    goal: 200,
    duration: 7,
    difficulty: 'EASY',
    reward: '75 pontos',
    icon: '🍽️',
    category: 'Alimentação',
    tips: [
      'Faça lista de compras',
      'Evite ir ao mercado com fome',
      'Aproveite promoções',
    ],
  },
  {
    id: 'budget-limit-entertainment',
    type: 'BUDGET_LIMIT',
    title: 'Entretenimento Controlado',
    description: 'Máximo de R$ 150 em lazer este mês',
    goal: 150,
    duration: 30,
    difficulty: 'MEDIUM',
    reward: 'Badge "Diversão Consciente"',
    icon: '🎬',
    category: 'Lazer',
    tips: [
      'Busque opções gratuitas',
      'Use parques e espaços públicos',
      'Faça programas em casa',
    ],
  },
  {
    id: 'reduce-food-50',
    type: 'CATEGORY_CONTROL',
    title: 'Reduza 50% em Alimentação',
    description: 'Diminua seus gastos com comida pela metade',
    goal: 50,
    duration: 30,
    difficulty: 'HARD',
    reward: 'Badge "Mestre da Economia" + 200 pontos',
    icon: '📉',
    category: 'Alimentação',
    tips: [
      'Compare com mês anterior',
      'Cozinhe em grandes quantidades',
      'Leve marmita',
      'Evite desperdícios',
    ],
  },

  // Desafios de Organização
  {
    id: 'categorize-all-week',
    type: 'CUSTOM',
    title: 'Organize Tudo',
    description: 'Categorize todas as transações por 7 dias',
    goal: 7,
    duration: 7,
    difficulty: 'EASY',
    reward: '80 pontos',
    icon: '📊',
    tips: [
      'Reserve 5 minutos por dia',
      'Use o app diariamente',
      'Crie categorias específicas',
    ],
  },
  {
    id: 'daily-tracking-month',
    type: 'CUSTOM',
    title: 'Controle Diário',
    description: 'Registre todas as despesas por 30 dias',
    goal: 30,
    duration: 30,
    difficulty: 'MEDIUM',
    reward: 'Badge "Organização Total" + 150 pontos',
    icon: '📝',
    tips: [
      'Registre assim que gastar',
      'Use lembretes diários',
      'Revise antes de dormir',
    ],
  },

  // Desafios de Aumento de Renda
  {
    id: 'extra-income-100',
    type: 'INCOME_INCREASE',
    title: 'Renda Extra: R$ 100',
    description: 'Ganhe R$ 100 extras este mês',
    goal: 100,
    duration: 30,
    difficulty: 'MEDIUM',
    reward: 'Badge "Empreendedor"',
    icon: '💼',
    tips: [
      'Venda itens não usados',
      'Ofereça serviços freelance',
      'Monetize um hobby',
    ],
  },
  {
    id: 'extra-income-500',
    type: 'INCOME_INCREASE',
    title: 'Renda Extra: R$ 500',
    description: 'Aumente sua renda em R$ 500 este mês',
    goal: 500,
    duration: 30,
    difficulty: 'HARD',
    reward: 'Badge "Múltiplas Fontes" + 250 pontos',
    icon: '💰',
    tips: [
      'Busque bicos ou freelas',
      'Venda produtos online',
      'Dê aulas particulares',
      'Revenda itens',
    ],
  },

  // Desafios Especiais
  {
    id: 'emergency-fund-start',
    type: 'SAVINGS',
    title: 'Início da Reserva',
    description: 'Separe seu primeiro R$ 1.000 de emergência',
    goal: 1000,
    duration: 60,
    difficulty: 'HARD',
    reward: 'Badge "Reserva Iniciada" + 300 pontos',
    icon: '🏦',
    tips: [
      'Separe 10-20% de cada renda',
      'Automatize a transferência',
      'Não toque no dinheiro',
      'Coloque em conta separada',
    ],
  },
  {
    id: 'debt-reduction',
    type: 'DEBT_REDUCTION',
    title: 'Reduza Dívidas',
    description: 'Pague R$ 500 de dívidas neste mês',
    goal: 500,
    duration: 30,
    difficulty: 'MEDIUM',
    reward: 'Badge "Liberdade Financeira"',
    icon: '🎯',
    tips: [
      'Liste todas as dívidas',
      'Priorize juros altos',
      'Negocie descontos',
      'Evite novas dívidas',
    ],
  },
];

/**
 * Filtra templates por dificuldade
 */
export function getTemplatesByDifficulty(difficulty: string): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter(t => t.difficulty === difficulty);
}

/**
 * Filtra templates por tipo
 */
export function getTemplatesByType(type: string): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter(t => t.type === type);
}

/**
 * Busca template por ID
 */
export function getTemplateById(id: string): ChallengeTemplate | undefined {
  return CHALLENGE_TEMPLATES.find(t => t.id === id);
}

/**
 * Recomenda desafios baseado no perfil do usuário
 */
export function getRecommendedChallenges(userLevel: number): ChallengeTemplate[] {
  if (userLevel <= 3) {
    // Iniciante: desafios fáceis
    return CHALLENGE_TEMPLATES.filter(t => t.difficulty === 'EASY').slice(0, 3);
  } else if (userLevel <= 7) {
    // Intermediário: mix de fáceis e médios
    return [
      ...CHALLENGE_TEMPLATES.filter(t => t.difficulty === 'EASY').slice(0, 1),
      ...CHALLENGE_TEMPLATES.filter(t => t.difficulty === 'MEDIUM').slice(0, 2),
    ];
  } else {
    // Avançado: desafios médios e difíceis
    return [
      ...CHALLENGE_TEMPLATES.filter(t => t.difficulty === 'MEDIUM').slice(0, 1),
      ...CHALLENGE_TEMPLATES.filter(t => t.difficulty === 'HARD').slice(0, 2),
    ];
  }
}
