"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Search, Filter, CheckCheck, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationItem } from './notification-item';
import { Notification, NotificationType, NotificationPriority } from '@/types/notifications';
import { cn } from '@/lib/utils';

function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '100',
        ...(selectedType !== 'all' && { type: selectedType }),
        ...(selectedPriority !== 'all' && { priority: selectedPriority }),
      });

      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedPriority]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Dismiss notification
  const dismissNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Erro ao dispensar notificação:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = filteredNotifications
        .filter(n => !n.isRead)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'markRead',
          ids: unreadIds 
        })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        );
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete',
          ids: filteredNotifications.map(n => n.id)
        })
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    // Text search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!notification.title.toLowerCase().includes(searchLower) &&
          !notification.message.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Tab filter (read/unread)
    if (activeTab === 'read' && !notification.isRead) return false;
    if (activeTab === 'unread' && notification.isRead) return false;

    return true;
  });

  // Counts
  const allCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const readCount = notifications.filter(n => n.isRead).length;

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar notificações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-48"
            >
              <option value="all">Todos os tipos</option>
              <option value={NotificationType.BUDGET_EXCEEDED}>Orçamento</option>
              <option value={NotificationType.LOW_BALANCE}>Saldo Baixo</option>
              <option value={NotificationType.GOAL_AT_RISK}>Meta em Risco</option>
              <option value={NotificationType.UNUSUAL_SPENDING}>Gasto Incomum</option>
              <option value={NotificationType.ACHIEVEMENT}>Conquista</option>
            </Select>

            <Select 
              value={selectedPriority} 
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-40"
            >
              <option value="all">Todas</option>
              <option value={NotificationPriority.URGENT}>Urgente</option>
              <option value={NotificationPriority.HIGH}>Alta</option>
              <option value={NotificationPriority.MEDIUM}>Média</option>
              <option value={NotificationPriority.LOW}>Baixa</option>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={filteredNotifications.length === 0}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar todas
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all" className="flex items-center gap-2">
            Todas
            {allCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {allCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            Não lidas
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="read" className="flex items-center gap-2">
            Lidas
            {readCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {readCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Carregando notificações...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma notificação encontrada</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || selectedType !== 'all' || selectedPriority !== 'all' 
                  ? 'Nenhuma notificação corresponde aos filtros aplicados.'
                  : activeTab === 'unread' 
                    ? 'Você não tem notificações não lidas.'
                    : 'Você não tem notificações ainda.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onDismiss={dismissNotification}
                  showActions={true}
                  compact={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { NotificationsPageClient };
export default NotificationsPageClient;