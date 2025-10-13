import { checkAllAlerts } from '@/lib/notifications/alertDetection';
import { prisma } from '@/lib/prisma';
import { NotificationPriority, NotificationType } from '@/types/notifications';
import { isBatchImportActive } from '@/lib/notifications/batchContext';

// Hook para ser chamado após criação/atualização de transações
export async function processTransactionAlerts(userId: string, transactionType: 'expense' | 'income') {
  try {
    // Pular processamento se estiver em contexto de importação em lote
    if (isBatchImportActive(userId)) {
      return;
    }
    
    // Verificar todos os alertas
    const alertResults = await checkAllAlerts(userId);
    
    // Criar notificações para alertas disparados
    for (const result of alertResults) {
      if (result.shouldNotify && result.notification) {
        // Para LOW_BALANCE, precisamos verificar carteira específica
        if (result.notification.type === NotificationType.LOW_BALANCE) {
          const walletId = (result.notification.data as { lowBalanceData?: { walletId?: string } })?.lowBalanceData?.walletId;
          
          if (walletId) {
            // Buscar notificações recentes desta carteira específica (últimas 24h)
            const recentNotifications = await prisma.notification.findMany({
              where: {
                userId,
                type: result.notification.type,
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
                }
              },
              orderBy: { createdAt: 'desc' }
            });

            // Filtrar apenas notificações desta carteira específica
            const walletNotifications = recentNotifications.filter((notif: { data: unknown }) => {
              const notifData = notif.data as { lowBalanceData?: { walletId?: string } };
              return notifData?.lowBalanceData?.walletId === walletId;
            });

            if (walletNotifications.length > 0) {
              // Existe notificação recente para esta carteira
              const latestNotification = walletNotifications[0];
              
              // Verificar o status da notificação mais recente
              if (!latestNotification.isActive) {
                // Notificação foi excluída - criar nova
                await prisma.notification.create({
                  data: {
                    userId,
                    type: result.notification.type,
                    title: result.notification.title,
                    message: result.notification.message,
                    priority: result.notification.priority,
                    data: result.notification.data as any,
                    isRead: false,
                    isActive: true,
                  }
                });
              } else if (latestNotification.isRead) {
                // Notificação foi visualizada - excluir a antiga e criar nova
                await prisma.notification.update({
                  where: { id: latestNotification.id },
                  data: { isActive: false }
                });
                
                await prisma.notification.create({
                  data: {
                    userId,
                    type: result.notification.type,
                    title: result.notification.title,
                    message: result.notification.message,
                    priority: result.notification.priority,
                    data: result.notification.data as any,
                    isRead: false,
                    isActive: true,
                  }
                });
              } else {
                // Notificação não foi visualizada - excluir a antiga e criar nova com dados atualizados
                await prisma.notification.update({
                  where: { id: latestNotification.id },
                  data: { isActive: false }
                });
                
                await prisma.notification.create({
                  data: {
                    userId,
                    type: result.notification.type,
                    title: result.notification.title,
                    message: result.notification.message,
                    priority: result.notification.priority,
                    data: result.notification.data as any,
                    isRead: false,
                    isActive: true,
                  }
                });
              }
            } else {
              // Não existe notificação recente para esta carteira - criar nova
              await prisma.notification.create({
                data: {
                  userId,
                  type: result.notification.type,
                  title: result.notification.title,
                  message: result.notification.message,
                  priority: result.notification.priority,
                  data: result.notification.data as any,
                  isRead: false,
                  isActive: true,
                }
              });
            }
          }
        } else {
          // Para outros tipos de notificação, usar lógica original
          const recentNotification = await prisma.notification.findFirst({
            where: {
              userId,
              type: result.notification.type,
              isActive: true,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
              }
            }
          });

          if (!recentNotification) {
            await prisma.notification.create({
              data: {
                userId,
                type: result.notification.type,
                title: result.notification.title,
                message: result.notification.message,
                priority: result.notification.priority,
                data: result.notification.data as any,
                isRead: false,
                isActive: true,
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar alertas de transação:', error);
  }
}

// Versão otimizada para processamento em lote (importação de extratos)
export async function processBatchTransactionAlerts(userId: string, transactionCount: { expenses: number, incomes: number }) {
  try {
    // Verificar todos os alertas uma única vez após todas as transações
    const alertResults = await checkAllAlerts(userId);
    
    // Criar notificações para alertas disparados (usando mesma lógica da função principal)
    for (const result of alertResults) {
      if (result.shouldNotify && result.notification) {
        // Para LOW_BALANCE, precisamos verificar carteira específica
        if (result.notification.type === NotificationType.LOW_BALANCE) {
          const walletId = (result.notification.data as any)?.lowBalanceData?.walletId;
          
          if (walletId) {
            // Buscar notificações recentes desta carteira específica (últimas 24h)
            const recentNotifications = await prisma.notification.findMany({
              where: {
                userId,
                type: result.notification.type,
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
                }
              },
              orderBy: { createdAt: 'desc' }
            });

            // Filtrar apenas notificações desta carteira específica
            const walletNotifications = recentNotifications.filter((notif: any) => {
              const notifData = notif.data as any;
              return notifData?.lowBalanceData?.walletId === walletId;
            });

            if (walletNotifications.length > 0) {
              // Existe notificação recente para esta carteira
              const latestNotification = walletNotifications[0];
              
              // Verificar o status da notificação mais recente
              if (!latestNotification.isActive) {
                // Notificação foi excluída - criar nova
                await prisma.notification.create({
                  data: {
                    userId,
                    type: result.notification.type,
                    title: result.notification.title,
                    message: result.notification.message,
                    priority: result.notification.priority,
                    data: result.notification.data as any,
                    isRead: false,
                    isActive: true,
                  }
                });
              } else if (latestNotification.isRead) {
                // Notificação foi visualizada - excluir a antiga e criar nova
                await prisma.notification.update({
                  where: { id: latestNotification.id },
                  data: { isActive: false }
                });
                
                await prisma.notification.create({
                  data: {
                    userId,
                    type: result.notification.type,
                    title: result.notification.title,
                    message: result.notification.message,
                    priority: result.notification.priority,
                    data: result.notification.data as any,
                    isRead: false,
                    isActive: true,
                  }
                });
              } else {
                // Notificação não foi visualizada - excluir a antiga e criar nova com dados atualizados
                await prisma.notification.update({
                  where: { id: latestNotification.id },
                  data: { isActive: false }
                });
                
                await prisma.notification.create({
                  data: {
                    userId,
                    type: result.notification.type,
                    title: result.notification.title,
                    message: result.notification.message,
                    priority: result.notification.priority,
                    data: result.notification.data as any,
                    isRead: false,
                    isActive: true,
                  }
                });
              }
            } else {
              // Não existe notificação recente para esta carteira - criar nova
              await prisma.notification.create({
                data: {
                  userId,
                  type: result.notification.type,
                  title: result.notification.title,
                  message: result.notification.message,
                  priority: result.notification.priority,
                  data: result.notification.data as any,
                  isRead: false,
                  isActive: true,
                }
              });
            }
          }
        } else {
          // Para outros tipos de notificação, usar lógica original
          const recentNotification = await prisma.notification.findFirst({
            where: {
              userId,
              type: result.notification.type,
              isActive: true,
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
              }
            }
          });

          if (!recentNotification) {
            await prisma.notification.create({
              data: {
                userId,
                type: result.notification.type,
                title: result.notification.title,
                message: result.notification.message,
                priority: result.notification.priority,
                data: result.notification.data as any,
                isRead: false,
                isActive: true,
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar alertas em lote:', error);
  }
}

// Verificação periódica de alertas (para usar em cron job)
export async function processPendingAlerts() {
  try {
    // Buscar todos os usuários ativos (que têm transações recentes)
    const activeUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            expenses: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
                }
              }
            }
          },
          {
            incomes: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
                }
              }
            }
          }
        ]
      },
      select: { id: true, email: true }
    });

    // Processar alertas para cada usuário
    for (const user of activeUsers) {
      await processTransactionAlerts(user.id, 'expense');
    }
  } catch (error) {
    console.error('Erro na verificação periódica:', error);
  }
}

// Hook para metas em risco (verificar diariamente)
export async function processGoalAlerts() {
  try {
    const users = await prisma.user.findMany({
      where: {
        goals: {
          some: {
            isCompleted: false,
            dueDate: {
              gte: new Date() // Metas que ainda não venceram
            }
          }
        }
      },
      select: { id: true }
    });

    for (const user of users) {
      const alertResults = await checkAllAlerts(user.id);
      
      for (const result of alertResults) {
        if (result.shouldNotify && result.notification) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: result.notification.type,
              title: result.notification.title,
              message: result.notification.message,
              priority: result.notification.priority,
              data: result.notification.data as any,
              isRead: false,
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao verificar metas:', error);
  }
}