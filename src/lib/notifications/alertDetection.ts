import { prisma } from '@/lib/prisma';
import { 
  NotificationType, 
  NotificationPriority, 
  AlertConfigType,
  NotificationData 
} from '@/types/notifications';

export interface AlertContext {
  userId: string;
  currentDate?: Date;
}

export interface AlertResult {
  shouldNotify: boolean;
  notification?: {
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    data: NotificationData;
  };
}

// Main function to check all alerts for a user
export async function checkAllAlerts(userId: string): Promise<AlertResult[]> {
  const context: AlertContext = {
    userId,
    currentDate: new Date(),
  };

  const results = await Promise.allSettled([
    checkBudgetExceeded(context),
    checkLowBalance(context),
  ]);

  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<AlertResult>).value)
    .filter(result => result.shouldNotify);
}

// 1. Budget Exceeded Alert
export async function checkBudgetExceeded(context: AlertContext): Promise<AlertResult> {
  try {
    const config = await prisma.alertConfiguration.findUnique({
      where: {
        userId_type: {
          userId: context.userId,
          type: AlertConfigType.BUDGET_EXCEEDED
        }
      }
    });

    if (!config || !config.isEnabled) {
      return { shouldNotify: false };
    }

    const currentDate = context.currentDate || new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get user's goals (budgets) for current month
    const goals = await prisma.goal.findMany({
      where: {
        userId: context.userId,
        active: true,
        kind: 'LIMIT', // Budget goals are limits
        OR: [
          { type: 'RECURRING' },
          {
            type: 'TIMED',
            startDate: { lte: endOfMonth },
            endDate: { gte: startOfMonth }
          }
        ]
      },
      include: {
        category: true
      }
    });

    for (const goal of goals) {
      const categoryIds = goal.categoryIds.length > 0 ? goal.categoryIds : 
                         goal.categoryId ? [goal.categoryId] : [];
      
      if (categoryIds.length === 0) continue;

      // Calculate current spending for this category
      const expenses = await prisma.expense.findMany({
        where: {
          userId: context.userId,
          categoryId: { in: categoryIds },
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      const totalSpent = expenses.reduce((sum: number, expense: any) => 
        sum + Number(expense.amount), 0
      );

      const budgetAmount = Number(goal.amount);
      const percentageUsed = (totalSpent / budgetAmount) * 100;

      // Check if we should notify based on settings
      const settings = config.settings as any;
      const notifyAt = settings?.budgetSettings?.notifyAt || [80, 90, 100];
      
      // Check each threshold
      for (const threshold of notifyAt) {
        if (percentageUsed >= threshold) {
          const hasNotified = await hasRecentNotification(context.userId, NotificationType.BUDGET_EXCEEDED, {
            categoryId: goal.categoryId || categoryIds[0],
            threshold
          });
          
          if (!hasNotified) {
            return {
              shouldNotify: true,
              notification: {
                type: NotificationType.BUDGET_EXCEEDED,
                title: `Orçamento Excedido: ${goal.category?.name || 'Categoria'}`,
                message: `Você já gastou R$ ${totalSpent.toFixed(2)} de R$ ${budgetAmount.toFixed(2)} (${percentageUsed.toFixed(1)}%) do seu orçamento mensal.`,
                priority: percentageUsed >= 100 ? NotificationPriority.URGENT : 
                         percentageUsed >= 90 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                data: {
                  budgetData: {
                    categoryId: goal.categoryId || categoryIds[0],
                    categoryName: goal.category?.name || 'Categoria',
                    budgetAmount,
                    currentAmount: totalSpent,
                    percentageUsed
                  }
                }
              }
            };
          }
        }
      }
    }

    return { shouldNotify: false };
  } catch (error) {
    console.error('Error checking budget exceeded:', error);
    return { shouldNotify: false };
  }
}

// 2. Low Balance Alert
export async function checkLowBalance(context: AlertContext): Promise<AlertResult> {
  try {
    const config = await prisma.alertConfiguration.findUnique({
      where: {
        userId_type: {
          userId: context.userId,
          type: AlertConfigType.LOW_BALANCE
        }
      }
    });

    if (!config || !config.isEnabled) {
      return { shouldNotify: false };
    }

    const thresholdAmount = Number(config.thresholdAmount) || 100;

    // Get all wallets with their current balances
    const wallets = await prisma.wallet.findMany({
      where: { userId: context.userId },
      include: {
        expenses: {
          where: {
            date: {
              lte: context.currentDate || new Date()
            }
          }
        },
        incomes: {
          where: {
            date: {
              lte: context.currentDate || new Date()
            }
          }
        }
      }
    });

    for (const wallet of wallets) {
      const totalIncomes = wallet.incomes.reduce((sum: number, income: any) => 
        sum + Number(income.amount), 0
      );
      const totalExpenses = wallet.expenses.reduce((sum: number, expense: any) => 
        sum + Number(expense.amount), 0
      );
      const currentBalance = totalIncomes - totalExpenses;

      if (currentBalance <= thresholdAmount) {
        const hasNotified = await hasRecentNotification(
          context.userId,
          NotificationType.LOW_BALANCE,
          { walletId: wallet.id },
          24 // Check last 24 hours
        );

        if (!hasNotified) {
          return {
            shouldNotify: true,
            notification: {
              type: NotificationType.LOW_BALANCE,
              title: 'Saldo Baixo',
              message: `O saldo da carteira "${wallet.name}" está baixo: R$ ${currentBalance.toFixed(2)}.`,
              priority: currentBalance <= 0 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
              data: {
                lowBalanceData: {
                  walletId: wallet.id,
                  walletName: wallet.name,
                  currentBalance,
                  thresholdAmount
                }
              }
            }
          };
        }
      }
    }

    return { shouldNotify: false };
  } catch (error) {
    console.error('Error checking low balance:', error);
    return { shouldNotify: false };
  }
}

// Utility functions
async function hasRecentNotification(
  userId: string, 
  type: NotificationType, 
  dataMatch: any,
  hoursBack: number = 1
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      createdAt: { gte: cutoffDate },
      isActive: true
    }
  });

  if (!existing) return false;

  // Check if the data matches (to avoid duplicate notifications for same event)
  const existingData = existing.data as any;
  if (!existingData) return false;

  // Simple deep comparison for key fields
  return Object.keys(dataMatch).every(key => 
    existingData[Object.keys(existingData)[0]]?.[key] === dataMatch[key]
  );
}