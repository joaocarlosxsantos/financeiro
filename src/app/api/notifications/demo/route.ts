import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationType, NotificationPriority } from '@/types/notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar o usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userId = user.id;

    // Criar algumas notificações de exemplo
    const sampleNotifications = [
      {
        userId,
        type: NotificationType.BUDGET_EXCEEDED,
        title: 'Orçamento Excedido',
        message: 'Você excedeu 90% do orçamento da categoria "Alimentação" este mês.',
        priority: NotificationPriority.HIGH,
        data: {
          budgetData: {
            categoryId: 'sample-category-1',
            categoryName: 'Alimentação',
            budgetAmount: 1000,
            currentAmount: 900,
            percentageUsed: 90
          }
        }
      },
      {
        userId,
        type: NotificationType.LOW_BALANCE,
        title: 'Saldo Baixo',
        message: 'O saldo da sua carteira "Conta Corrente" está abaixo do limite configurado.',
        priority: NotificationPriority.MEDIUM,
        data: {
          lowBalanceData: {
            walletId: 'sample-wallet-1',
            walletName: 'Conta Corrente',
            currentBalance: 150,
            thresholdAmount: 200
          }
        }
      },
      {
        userId,
        type: NotificationType.UNUSUAL_SPENDING,
        title: 'Gasto Incomum Detectado',
        message: 'Foi detectado um gasto 75% acima da média na categoria "Entretenimento".',
        priority: NotificationPriority.MEDIUM,
        data: {
          unusualSpendingData: {
            transactionId: 'sample-transaction-1',
            amount: 350,
            categoryId: 'sample-category-2',
            categoryName: 'Entretenimento',
            averageAmount: 200,
            percentageIncrease: 75
          }
        }
      },
      {
        userId,
        type: NotificationType.GOAL_AT_RISK,
        title: 'Meta em Risco',
        message: 'Sua meta "Viagem de Férias" pode não ser cumprida no prazo.',
        priority: NotificationPriority.URGENT,
        data: {
          goalData: {
            goalId: 'sample-goal-1',
            goalTitle: 'Viagem de Férias',
            targetAmount: 5000,
            currentAmount: 1500,
            percentageComplete: 30,
            daysRemaining: 60
          }
        }
      },
      {
        userId,
        type: NotificationType.ACHIEVEMENT,
        title: 'Conquista Desbloqueada! 🎉',
        message: 'Parabéns! Você atingiu sua meta de economia mensal.',
        priority: NotificationPriority.LOW,
        data: {
          achievementData: {
            title: 'Economizador do Mês',
            description: 'Economizou mais de R$ 500 neste mês',
            amount: 650
          }
        }
      },
      {
        userId,
        type: NotificationType.RECURRING_DUE,
        title: 'Conta a Vencer',
        message: 'A conta "Internet" vence em 3 dias.',
        priority: NotificationPriority.MEDIUM,
        data: {
          recurringData: {
            transactionId: 'sample-recurring-1',
            description: 'Internet',
            amount: 89.90,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'expense' as const
          }
        }
      }
    ];

    // Criar as notificações no banco
    await prisma.notification.createMany({
      data: sampleNotifications
    });

    return NextResponse.json({ 
      message: 'Notificações de exemplo criadas com sucesso!',
      count: sampleNotifications.length 
    });

  } catch (error) {
    console.error('Erro ao criar notificações de exemplo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}