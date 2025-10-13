'use client';

import { useNotificationStream, NotificationEvent } from '@/hooks/use-notification-stream';
import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationToastProps {
  notification: NotificationEvent;
  onClose: () => void;
}

function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-close after 5 seconds for non-critical notifications
  useEffect(() => {
    if (notification.type === 'notification' && notification.data?.severity !== 'high') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const getIcon = () => {
    switch (notification.data?.severity || notification.type) {
      case 'alert':
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.data?.severity || notification.type) {
      case 'alert':
      case 'high':
        return 'border-l-red-500';
      case 'warning':
      case 'medium':
        return 'border-l-yellow-500';
      case 'success':
        return 'border-l-green-500';
      default:
        return 'border-l-blue-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      bg-white border-l-4 ${getBorderColor()} rounded-lg shadow-lg p-4 mb-3 max-w-sm
    `}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {notification.data?.title || 'Nova Notificação'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {notification.data?.message || JSON.stringify(notification.data)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {formatDistanceToNow(new Date(notification.timestamp), {
              addSuffix: true,
              locale: ptBR
            })}
          </p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function NotificationStream() {
  const {
    isConnected,
    connectionError,
    notifications,
    unreadCount,
    clearNotifications,
    markAllAsRead
  } = useNotificationStream({
    onConnect: () => console.log('Conectado ao stream de notificações'),
    onDisconnect: () => console.log('Desconectado do stream de notificações'),
    onNotification: (notification) => {
     
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.data?.title || 'Nova Notificação', {
          body: notification.data?.message || 'Você tem uma nova notificação',
          icon: '/financeiro.png',
          tag: notification.id
        });
      }
    }
  });

  const [showAll, setShowAll] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<NotificationEvent[]>([]);

  // Show toast notifications for recent notifications
  useEffect(() => {
    const recentNotifications = notifications.slice(0, 3); // Show only 3 most recent
    setToastNotifications(recentNotifications);
  }, [notifications]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const removeToast = (notificationId: string) => {
    setToastNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
  };

  return (
    <div className="relative">
      {/* Connection Status Indicator */}
      <div className="flex items-center space-x-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-sm text-gray-600">
          {isConnected ? 'Conectado' : connectionError || 'Desconectado'}
        </span>
      </div>

      {/* Notification Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium">Notificações</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <Check className="h-4 w-4" />
              <span>Marcar como lidas</span>
            </button>
          )}
          <button
            onClick={clearNotifications}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Limpar todas
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhuma notificação ainda
          </p>
        ) : (
          notifications
            .slice(0, showAll ? undefined : 5)
            .map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border rounded-lg transition-colors ${
                  notification.data?.read 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {notification.type === 'alert' ? (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.data?.title || 'Notificação'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.data?.message || JSON.stringify(notification.data)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(notification.timestamp), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
        )}
        
        {notifications.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2"
          >
            Ver todas as {notifications.length} notificações
          </button>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toastNotifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeToast(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}