import { useEffect, useRef, useState, useCallback } from 'react';

export interface NotificationEvent {
  id: string;
  type: 'notification' | 'alert' | 'heartbeat';
  data: any;
  timestamp: string;
  userId: string;
}

export interface UseNotificationStreamOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onNotification?: (notification: NotificationEvent) => void;
}

export function useNotificationStream(options: UseNotificationStreamOptions = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    onConnect,
    onDisconnect,
    onError,
    onNotification
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);

  const addNotification = useCallback((notification: NotificationEvent) => {
    setNotifications(prev => {
      // Keep only last 100 notifications to prevent memory issues
      const updated = [notification, ...prev].slice(0, 100);
      return updated;
    });
    onNotification?.(notification);
  }, [onNotification]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionError(null);
    
    try {
      const eventSource = new EventSource('/api/notifications/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setReconnectAttempts(0);
        setConnectionError(null);
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const notification: NotificationEvent = JSON.parse(event.data);
          
          // Skip heartbeat events for UI
          if (notification.type !== 'heartbeat') {
            addNotification(notification);
          }
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      eventSource.onerror = (error) => {
        setIsConnected(false);
        setConnectionError('Connection error');
        onError?.(error);
        
        eventSource.close();
        
        // Attempt to reconnect if allowed
        if (shouldReconnect.current && reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnect.current) {
              connect();
            }
          }, reconnectInterval);
        } else {
          setConnectionError('Maximum reconnection attempts reached');
          onDisconnect?.();
        }
      };

    } catch (error) {
      setConnectionError('Failed to establish connection');
      console.error('Failed to create EventSource:', error);
    }
  }, [reconnectAttempts, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, addNotification]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({
        ...notification,
        data: { ...notification.data, read: true }
      }))
    );
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      shouldReconnect.current = true;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection state
    isConnected,
    connectionError,
    reconnectAttempts,
    
    // Notifications
    notifications,
    unreadCount: notifications.filter(n => !n.data?.read).length,
    
    // Actions
    connect,
    disconnect,
    clearNotifications,
    markAllAsRead,
    
    // Manual notification management
    addNotification: (notification: Omit<NotificationEvent, 'timestamp'>) => {
      addNotification({
        ...notification,
        timestamp: new Date().toISOString()
      });
    }
  };
}