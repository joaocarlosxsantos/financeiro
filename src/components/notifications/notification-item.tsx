"use client";

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NOTIFICATION_ICONS, 
  PRIORITY_COLORS 
} from '@/types/notifications';
import { 
  AlertTriangle, 
  TrendingUp, 
  AlertCircle, 
  Target, 
  Copy, 
  Calendar, 
  FileText, 
  Award, 
  Info, 
  Bell,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

const iconMap = {
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  Target,
  Copy,
  Calendar,
  FileText,
  Award,
  Info,
  Bell,
};

export function NotificationItem({ 
  notification, 
  onMarkRead, 
  onDismiss,
  showActions = true,
  compact = false 
}: NotificationItemProps) {
  const iconConfig = NOTIFICATION_ICONS[notification.type];
  const IconComponent = iconMap[iconConfig.icon as keyof typeof iconMap] || Bell;
  const priorityColor = PRIORITY_COLORS[notification.priority];

  const handleMarkRead = () => {
    if (onMarkRead && !notification.isRead) {
      onMarkRead(notification.id);
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(notification.id);
    }
  };

  const getTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true,
        locale: ptBR 
      });
    } catch {
      return 'há pouco tempo';
    }
  };

  const getBadgeText = (type: NotificationType) => {
    const badges = {
      [NotificationType.BUDGET_EXCEEDED]: 'Orçamento',
      [NotificationType.UNUSUAL_SPENDING]: 'Gasto Incomum',
      [NotificationType.LOW_BALANCE]: 'Saldo Baixo',
      [NotificationType.GOAL_AT_RISK]: 'Meta',
      [NotificationType.DUPLICATE_TRANSACTION]: 'Duplicata',
      [NotificationType.RECURRING_DUE]: 'Recorrente',
      [NotificationType.MONTHLY_SUMMARY]: 'Resumo',
      [NotificationType.ACHIEVEMENT]: 'Conquista',
      [NotificationType.SYSTEM]: 'Sistema',
      [NotificationType.CUSTOM]: 'Personalizado',
    };
    return badges[type] || 'Notificação';
  };

  return (
    <div 
      className={cn(
        'flex items-start gap-3 p-4 border rounded-lg transition-all duration-200 hover:shadow-md',
        !notification.isRead && 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
        notification.isRead && 'bg-background border-border',
        compact && 'p-3'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0',
        iconConfig.bgColor,
        compact && 'w-8 h-8'
      )}>
        <IconComponent 
          className={cn(
            'w-5 h-5',
            iconConfig.color,
            compact && 'w-4 h-4'
          )} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={cn(
              'font-semibold text-foreground truncate',
              compact ? 'text-sm' : 'text-base'
            )}>
              {notification.title}
            </h4>
            
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            )}>
              {getBadgeText(notification.type)}
            </span>

            {notification.priority !== NotificationPriority.MEDIUM && (
              <span className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                notification.priority === NotificationPriority.URGENT && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                notification.priority === NotificationPriority.HIGH && 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                notification.priority === NotificationPriority.LOW && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              )}>
                {notification.priority === NotificationPriority.URGENT && 'Urgente'}
                {notification.priority === NotificationPriority.HIGH && 'Alta'}
                {notification.priority === NotificationPriority.LOW && 'Baixa'}
              </span>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkRead}
                  className="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                  title="Marcar como lida"
                >
                  <Check className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-10 w-10 p-0 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                title="Dispensar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Message */}
        <p className={cn(
          'text-muted-foreground mb-2',
          compact ? 'text-sm' : 'text-base'
        )}>
          {notification.message}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{getTimeAgo(notification.createdAt)}</span>
          {!notification.isRead && (
            <span className="w-2 h-2 bg-blue-600 rounded-full" title="Não lida" />
          )}
        </div>
      </div>
    </div>
  );
}