/**
 * Verificador Automático de Conquistas
 * 
 * Verifica e concede badges automaticamente quando condições são atingidas
 * @module lib/achievement-checker
 */

import { prisma } from '@/lib/prisma';
import { BADGE_DEFINITIONS, BadgeType } from './achievements';

/**
 * Concede um badge ao usuário (se ainda não tiver)
 */
export async function grantAchievement(
  userId: string,
  badgeType: BadgeType,
  metadata?: any
): Promise<boolean> {
  try {
    // Verifica se já tem o badge
    const existing = await prisma.achievement.findFirst({
      where: {
        userId,
        badgeType,
      },
    });

    if (existing) {
      return false; // Já possui
    }

    const badgeInfo = BADGE_DEFINITIONS[badgeType];

    // Cria a conquista
    await prisma.achievement.create({
      data: {
        userId,
        badgeType,
        title: badgeInfo.title,
        description: badgeInfo.description,
        progress: 100,
        metadata: metadata || {},
      },
    });

    // Atualiza estatísticas do usuário
    await updateUserStats(userId, badgeInfo.points);

    return true;
  } catch (error) {
    console.error('Erro ao conceder achievement:', error);
    return false;
  }
}

/**
 * Atualiza estatísticas do usuário
 */
async function updateUserStats(userId: string, pointsToAdd: number) {
  const stats = await prisma.userStats.findUnique({
    where: { userId },
  });

  if (!stats) {
    // Cria estatísticas se não existir
    await prisma.userStats.create({
      data: {
        userId,
        totalAchievements: 1,
        points: pointsToAdd,
        level: Math.floor(pointsToAdd / 100) + 1,
        lastActivityDate: new Date(),
      },
    });
  } else {
    const newPoints = stats.points + pointsToAdd;
    const newLevel = Math.floor(newPoints / 100) + 1;

    await prisma.userStats.update({
      where: { userId },
      data: {
        totalAchievements: { increment: 1 },
        points: newPoints,
        level: newLevel,
        lastActivityDate: new Date(),
      },
    });
  }
}

/**
 * Verifica conquistas de economia
 */
export async function checkSavingsAchievements(userId: string) {
  // Calcula economia total (receitas - despesas)
  const [incomes, expenses] = await Promise.all([
    prisma.income.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = Number(incomes._sum.amount || 0);
  const totalExpense = Number(expenses._sum.amount || 0);
  const savings = totalIncome - totalExpense;

  if (savings > 0) {
    await grantAchievement(userId, 'FIRST_SAVINGS');
  }

  if (savings >= 1000) {
    await grantAchievement(userId, 'SAVED_1K');
  }

  if (savings >= 5000) {
    await grantAchievement(userId, 'SAVED_5K');
  }

  if (savings >= 10000) {
    await grantAchievement(userId, 'SAVED_10K');
  }
}

/**
 * Verifica conquistas de metas
 */
export async function checkGoalAchievements(userId: string) {
  const goalsCount = await prisma.goal.count({
    where: { userId },
  });

  if (goalsCount >= 1) {
    await grantAchievement(userId, 'FIRST_GOAL');
  }

  // Pode adicionar lógica para GOAL_ACHIEVED quando meta for atingida
}

/**
 * Verifica conquistas de engajamento
 */
export async function checkEngagementAchievements(userId: string) {
  const stats = await prisma.userStats.findUnique({
    where: { userId },
  });

  if (!stats) return;

  if (stats.currentStreak >= 7) {
    await grantAchievement(userId, 'EARLY_BIRD');
  }

  if (stats.currentStreak >= 30) {
    await grantAchievement(userId, 'CONSISTENT_USER');
  }

  if (stats.currentStreak >= 100) {
    await grantAchievement(userId, 'POWER_USER');
  }

  // Verifica se completou 1 ano
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (user) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (user.createdAt <= oneYearAgo) {
      await grantAchievement(userId, 'YEAR_REVIEW');
    }
  }
}

/**
 * Verifica conquistas de categorização
 */
export async function checkCategorizationAchievements(userId: string) {
  const categorizedCount = await prisma.expense.count({
    where: {
      userId,
      categoryId: { not: null },
    },
  });

  if (categorizedCount >= 100) {
    await grantAchievement(userId, 'CATEGORY_MASTER');
  }
}

/**
 * Atualiza streak (dias consecutivos de uso)
 */
export async function updateUserStreak(userId: string) {
  const stats = await prisma.userStats.findUnique({
    where: { userId },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!stats) {
    // Cria estatísticas
    await prisma.userStats.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: new Date(),
      },
    });
    return;
  }

  const lastActivity = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;
  
  if (!lastActivity) {
    // Primeira atividade
    await prisma.userStats.update({
      where: { userId },
      data: {
        currentStreak: 1,
        longestStreak: Math.max(1, stats.longestStreak),
        lastActivityDate: new Date(),
      },
    });
    return;
  }

  lastActivity.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Mesmo dia, apenas atualiza timestamp
    await prisma.userStats.update({
      where: { userId },
      data: { lastActivityDate: new Date() },
    });
  } else if (daysDiff === 1) {
    // Dia consecutivo
    const newStreak = stats.currentStreak + 1;
    await prisma.userStats.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, stats.longestStreak),
        lastActivityDate: new Date(),
      },
    });
  } else {
    // Quebrou a sequência
    await prisma.userStats.update({
      where: { userId },
      data: {
        currentStreak: 1,
        lastActivityDate: new Date(),
      },
    });
  }
}

/**
 * Verifica todas as conquistas de uma vez
 */
export async function checkAllAchievements(userId: string) {
  try {
    await Promise.all([
      checkSavingsAchievements(userId),
      checkGoalAchievements(userId),
      checkEngagementAchievements(userId),
      checkCategorizationAchievements(userId),
      updateUserStreak(userId),
    ]);
  } catch (error) {
    console.error('Erro ao verificar achievements:', error);
  }
}
