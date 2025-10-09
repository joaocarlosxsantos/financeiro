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

  it('should show unread status for unread notifications', () => {
    const unreadNotification = { ...mockNotification, isRead: false };
    render(<NotificationItem notification={unreadNotification} />);
    
    // Check for unread indicator (usually a badge or different styling)
    const item = screen.getByTestId('notification-item') || screen.getByRole('article');
    expect(item).toHaveClass('opacity-100'); // or whatever class indicates unread
  });

  it('should show read status for read notifications', () => {
    const readNotification = { ...mockNotification, isRead: true };
    render(<NotificationItem notification={readNotification} />);
    
    const item = screen.getByTestId('notification-item') || screen.getByRole('article');
    expect(item).toHaveClass('opacity-60'); // or whatever class indicates read
  });

  it('should display correct priority styling for high priority', () => {
    const highPriorityNotification = { ...mockNotification, priority: NotificationPriority.HIGH };
    render(<NotificationItem notification={highPriorityNotification} />);
    
    // Look for high priority indicators (red colors, urgent styling)
    const priorityElement = screen.getByTestId('priority-indicator') || document.querySelector('[class*="red"]');
    expect(priorityElement).toBeInTheDocument();
  });

  it('should display correct priority styling for low priority', () => {
    const lowPriorityNotification = { ...mockNotification, priority: NotificationPriority.LOW };
    render(<NotificationItem notification={lowPriorityNotification} />);
    
    // Look for low priority indicators (gray colors, subtle styling)
    const priorityElement = screen.getByTestId('priority-indicator') || document.querySelector('[class*="gray"]');
    expect(priorityElement).toBeInTheDocument();
  });

  it('should call onMarkRead when mark as read action is triggered', () => {
    const onMarkRead = jest.fn();
    render(
      <NotificationItem 
        notification={mockNotification} 
        onMarkRead={onMarkRead} 
        showActions={true}
      />
    );
    
    const markReadButton = screen.getByRole('button', { name: /marcar como lida/i }) || 
                          screen.getByTestId('mark-read-button');
    
    if (markReadButton) {
      fireEvent.click(markReadButton);
      expect(onMarkRead).toHaveBeenCalledWith('notif-1');
    }
  });

  it('should call onDismiss when dismiss action is triggered', () => {
    const onDismiss = jest.fn();
    render(
      <NotificationItem 
        notification={mockNotification} 
        onDismiss={onDismiss} 
        showActions={true}
      />
    );
    
    const dismissButton = screen.getByRole('button', { name: /descartar/i }) || 
                         screen.getByTestId('dismiss-button');
    
    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledWith('notif-1');
    }
  });

  it('should display relative time correctly', () => {
    render(<NotificationItem notification={mockNotification} />);
    
    // Should show relative time like "há 3 dias" or similar
    const timeElement = screen.getByText(/há/i) || screen.getByTestId('relative-time');
    expect(timeElement).toBeInTheDocument();
  });

  it('should render in compact mode when compact prop is true', () => {
    render(<NotificationItem notification={mockNotification} compact={true} />);
    
    const item = screen.getByTestId('notification-item') || screen.getByRole('article');
    expect(item).toHaveClass('compact'); // or whatever class indicates compact mode
  });

  it('should show appropriate icon for different notification types', () => {
    const budgetNotification = { ...mockNotification, type: NotificationType.BUDGET_EXCEEDED };
    const { rerender } = render(<NotificationItem notification={budgetNotification} />);
    
    // Look for icon related to budget exceeded
    let icon = screen.getByTestId('notification-icon') || document.querySelector('svg');
    expect(icon).toBeInTheDocument();
    
    // Test different notification type
    const lowBalanceNotification = { ...mockNotification, type: NotificationType.LOW_BALANCE };
    rerender(<NotificationItem notification={lowBalanceNotification} />);
    
    icon = screen.getByTestId('notification-icon') || document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should handle missing optional data gracefully', () => {
    const minimalNotification = {
      id: 'notif-minimal',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      title: 'System Notification',
      message: 'Test message',
      priority: NotificationPriority.MEDIUM,
      isRead: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    expect(() => {
      render(<NotificationItem notification={minimalNotification} />);
    }).not.toThrow();
  });

  it('should not show actions when showActions is false', () => {
    render(
      <NotificationItem 
        notification={mockNotification} 
        showActions={false}
      />
    );
    
    const markReadButton = screen.queryByRole('button', { name: /marcar como lida/i });
    const dismissButton = screen.queryByRole('button', { name: /descartar/i });
    
    expect(markReadButton).not.toBeInTheDocument();
    expect(dismissButton).not.toBeInTheDocument();
  });
});