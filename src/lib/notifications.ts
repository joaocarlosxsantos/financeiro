import { sendNotificationToUser, broadcastNotification } from '@/lib/notifications/sse-utils';

export interface NotificationData {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  severity?: 'low' | 'medium' | 'high';
  category?: 'transaction' | 'alert' | 'system' | 'goal' | 'budget';
  action?: {
    label: string;
    url: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Send a real-time notification to a specific user
 */
export function sendRealtimeNotification(userId: string, data: NotificationData) {
  const notification = {
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'notification' as const,
    timestamp: new Date(),
    data: {
      ...data,
      read: false,
      createdAt: new Date().toISOString()
    }
  };

  sendNotificationToUser(userId, notification);
  
  return notification;
}

/**
 * Send a real-time alert to a specific user
 */
export function sendRealtimeAlert(userId: string, data: NotificationData) {
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'alert' as const,
    timestamp: new Date(),
    data: {
      ...data,
      severity: data.severity || 'high',
      read: false,
      createdAt: new Date().toISOString()
    }
  };

  sendNotificationToUser(userId, alert);
  
  return alert;
}

/**
 * Broadcast a notification to all connected users
 */
export function broadcastRealtimeNotification(data: NotificationData) {
  const notification = {
    id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'notification' as const,
    timestamp: new Date(),
    data: {
      ...data,
      broadcast: true,
      read: false,
      createdAt: new Date().toISOString()
    }
  };

  broadcastNotification(notification);
  
  return notification;
}

/**
 * Predefined notification templates for common scenarios
 */
export const NotificationTemplates = {
  // Transaction notifications
  transactionCreated: (amount: number, description: string): NotificationData => ({
    title: 'Transação Registrada',
    message: `Nova transação: ${description} - R$ ${amount.toFixed(2)}`,
    type: 'success',
    category: 'transaction',
    severity: 'low'
  }),

  transactionLarge: (amount: number, description: string): NotificationData => ({
    title: 'Transação de Alto Valor',
    message: `Transação grande detectada: ${description} - R$ ${amount.toFixed(2)}`,
    type: 'warning',
    category: 'transaction',
    severity: 'medium'
  }),

  // Budget alerts
  budgetExceeded: (category: string, spent: number, limit: number): NotificationData => ({
    title: 'Orçamento Excedido',
    message: `Você gastou R$ ${spent.toFixed(2)} de R$ ${limit.toFixed(2)} em ${category}`,
    type: 'error',
    category: 'budget',
    severity: 'high'
  }),

  budgetWarning: (category: string, spent: number, limit: number): NotificationData => ({
    title: 'Alerta de Orçamento',
    message: `Você já gastou ${Math.round((spent/limit) * 100)}% do orçamento em ${category}`,
    type: 'warning',
    category: 'budget',
    severity: 'medium'
  }),

  // Goal notifications
  goalAchieved: (goalName: string): NotificationData => ({
    title: 'Meta Atingida! 🎉',
    message: `Parabéns! Você atingiu a meta: ${goalName}`,
    type: 'success',
    category: 'goal',
    severity: 'medium'
  }),

  goalProgress: (goalName: string, progress: number): NotificationData => ({
    title: 'Progresso da Meta',
    message: `Você está ${progress}% perto de atingir: ${goalName}`,
    type: 'info',
    category: 'goal',
    severity: 'low'
  }),

  // System notifications
  systemMaintenance: (scheduledTime: string): NotificationData => ({
    title: 'Manutenção Programada',
    message: `Sistema será atualizado em ${scheduledTime}. Salve seu trabalho.`,
    type: 'warning',
    category: 'system',
    severity: 'medium'
  }),

  systemUpdate: (version: string): NotificationData => ({
    title: 'Sistema Atualizado',
    message: `Sistema atualizado para versão ${version}. Confira as novidades!`,
    type: 'success',
    category: 'system',
    severity: 'low'
  }),

  // Security alerts
  loginDetected: (location: string, device: string): NotificationData => ({
    title: 'Novo Login Detectado',
    message: `Login realizado de ${location} usando ${device}`,
    type: 'info',
    category: 'system',
    severity: 'medium'
  }),

  suspiciousActivity: (activity: string): NotificationData => ({
    title: 'Atividade Suspeita',
    message: `Detectamos: ${activity}. Verifique sua conta.`,
    type: 'error',
    category: 'system',
    severity: 'high',
    action: {
      label: 'Verificar Conta',
      url: '/user/security'
    }
  })
};

/**
 * Helper function to send templated notifications
 */
export function sendTemplatedNotification(
  userId: string, 
  template: keyof typeof NotificationTemplates,
  ...args: any[]
) {
  const notificationData = (NotificationTemplates[template] as any)(...args);
  return sendRealtimeNotification(userId, notificationData);
}

/**
 * Helper function to send templated alerts
 */
export function sendTemplatedAlert(
  userId: string, 
  template: keyof typeof NotificationTemplates,
  ...args: any[]
) {
  const alertData = (NotificationTemplates[template] as any)(...args);
  return sendRealtimeAlert(userId, alertData);
}