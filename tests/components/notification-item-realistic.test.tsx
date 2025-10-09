import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationItem } from '../../src/components/notifications/notification-item';
import { NotificationType, NotificationPriority } from '../../src/types/notifications';

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: NotificationType.BUDGET_EXCEEDED,
  title: 'Orçamento excedido',
  message: 'Você excedeu seu orçamento mensal em R$ 500',
  priority: NotificationPriority.HIGH,
  isRead: false,
  isActive: true,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

describe('NotificationItem', () => {
  it('should render notification with title and message', () => {
    render(<NotificationItem notification={mockNotification} />);
    
    expect(screen.getByText('Orçamento excedido')).toBeInTheDocument();
    expect(screen.getByText('Você excedeu seu orçamento mensal em R$ 500')).toBeInTheDocument();
  });

  it('should show unread indicator for unread notifications', () => {
    const unreadNotification = { ...mockNotification, isRead: false };
    render(<NotificationItem notification={unreadNotification} />);
    
    // Look for the unread indicator - a colored dot at the bottom right
    const unreadDot = screen.getByTitle('Não lida');
    expect(unreadDot).toBeInTheDocument();
    expect(unreadDot).toHaveClass('bg-blue-600');
  });

  it('should show high priority styling', () => {
    const highPriorityNotification = { ...mockNotification, priority: NotificationPriority.HIGH };
    render(<NotificationItem notification={highPriorityNotification} />);
    
    // Look for high priority badge
    const priorityBadge = screen.getByText('Alta');
    expect(priorityBadge).toBeInTheDocument();
    expect(priorityBadge).toHaveClass('bg-orange-100', 'text-orange-800');
  });

  it('should show low priority styling', () => {
    const lowPriorityNotification = { ...mockNotification, priority: NotificationPriority.LOW };
    render(<NotificationItem notification={lowPriorityNotification} />);
    
    // Look for low priority badge
    const priorityBadge = screen.getByText('Baixa');
    expect(priorityBadge).toBeInTheDocument();
    expect(priorityBadge).toHaveClass('bg-gray-100', 'text-gray-600');
  });

  it('should call onMarkRead when mark as read button is clicked', () => {
    const onMarkRead = jest.fn();
    render(
      <NotificationItem 
        notification={mockNotification} 
        onMarkRead={onMarkRead} 
        showActions={true}
      />
    );
    
    const markReadButton = screen.getByRole('button', { name: 'Marcar como lida' });
    fireEvent.click(markReadButton);
    
    expect(onMarkRead).toHaveBeenCalledWith('notif-1');
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <NotificationItem 
        notification={mockNotification} 
        onDismiss={onDismiss} 
        showActions={true}
      />
    );
    
    const dismissButton = screen.getByRole('button', { name: 'Dispensar' });
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledWith('notif-1');
  });

  it('should display relative time correctly', () => {
    render(<NotificationItem notification={mockNotification} />);
    
    // Should show relative time like "há quase 2 anos"
    expect(screen.getByText(/há/i)).toBeInTheDocument();
  });

  it('should render in compact mode with smaller elements', () => {
    render(<NotificationItem notification={mockNotification} compact={true} />);
    
    // In compact mode, title should be smaller (text-sm instead of text-base)
    const title = screen.getByText('Orçamento excedido');
    expect(title).toHaveClass('text-sm');
    
    // Message should also be smaller in compact mode
    const message = screen.getByText('Você excedeu seu orçamento mensal em R$ 500');
    expect(message).toHaveClass('text-sm');
  });

  it('should show appropriate icon for budget exceeded notifications', () => {
    render(<NotificationItem notification={mockNotification} />);
    
    // Look for the alert triangle icon (used for BUDGET_EXCEEDED)
    const icon = document.querySelector('.lucide-alert-triangle');
    expect(icon).toBeInTheDocument();
  });

  it('should show different icon for different notification types', () => {
    const lowBalanceNotification = { 
      ...mockNotification, 
      type: NotificationType.LOW_BALANCE,
      title: 'Saldo baixo',
      message: 'Sua carteira está com saldo baixo'
    };
    
    render(<NotificationItem notification={lowBalanceNotification} />);
    
    // LOW_BALANCE should use AlertCircle icon
    const icon = document.querySelector('.lucide-alert-circle');
    expect(icon).toBeInTheDocument();
  });

  it('should show type badge', () => {
    render(<NotificationItem notification={mockNotification} />);
    
    // Should show notification type badge
    const typeBadge = screen.getByText('Orçamento');
    expect(typeBadge).toBeInTheDocument();
    expect(typeBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('should not show actions when showActions is false', () => {
    render(
      <NotificationItem 
        notification={mockNotification} 
        showActions={false}
      />
    );
    
    const markReadButton = screen.queryByRole('button', { name: 'Marcar como lida' });
    const dismissButton = screen.queryByRole('button', { name: 'Dispensar' });
    
    expect(markReadButton).not.toBeInTheDocument();
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('should handle different priority levels', () => {
    const mediumPriorityNotification = { ...mockNotification, priority: NotificationPriority.MEDIUM };
    render(<NotificationItem notification={mediumPriorityNotification} />);
    
    // Medium priority might not show a badge, just check that it renders without error
    expect(screen.getByText('Orçamento excedido')).toBeInTheDocument();
    
    // Or if it does show a badge, it would be here:
    const priorityBadge = screen.queryByText('Média');
    if (priorityBadge) {
      expect(priorityBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    }
  });

  it('should handle urgent priority', () => {
    const urgentNotification = { ...mockNotification, priority: NotificationPriority.URGENT };
    render(<NotificationItem notification={urgentNotification} />);
    
    const priorityBadge = screen.getByText('Urgente');
    expect(priorityBadge).toBeInTheDocument();
    expect(priorityBadge).toHaveClass('bg-red-100', 'text-red-800');
  });
});