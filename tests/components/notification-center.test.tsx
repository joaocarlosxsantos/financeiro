import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationCenter } from '../../src/components/notifications/notification-center';
import { NotificationType, NotificationPriority } from '../../src/types/notifications';

const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: NotificationType.BUDGET_EXCEEDED,
    title: 'Orçamento excedido',
    message: 'Você excedeu seu orçamento mensal',
    priority: NotificationPriority.HIGH,
    isRead: false,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    type: NotificationType.LOW_BALANCE,
    title: 'Saldo baixo',
    message: 'Sua carteira está com saldo baixo',
    priority: NotificationPriority.MEDIUM,
    isRead: true,
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

// Mock fetch
global.fetch = jest.fn();

describe('NotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        notifications: mockNotifications,
        total: 2,
        unreadCount: 1,
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render notification bell button', () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    expect(bellButton).toBeInTheDocument();
  });

  it('should show unread count badge when there are unread notifications', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const badge = screen.getByText('1') || screen.getByTestId('unread-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  it('should fetch notifications when opened', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/notifications?limit=50');
    });
  });

  it('should display notifications list when opened', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Orçamento excedido')).toBeInTheDocument();
      expect(screen.getByText('Saldo baixo')).toBeInTheDocument();
    });
  });

  it('should handle empty notifications list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        notifications: [],
        total: 0,
        unreadCount: 0,
      }),
    });

    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText(/nenhuma notificação/i) ||
             screen.getByText(/sem notificações/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao carregar notificações:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should show loading state while fetching', async () => {
    let resolvePromise: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    // Should show loading indicator
    expect(screen.getByText(/carregando/i) ||
           screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({
        notifications: [],
        total: 0,
        unreadCount: 0,
      }),
    });
  });

  it('should filter notifications by type', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const filterButton = screen.getByText(/filtrar/i) ||
                          screen.getByTestId('filter-button');
      if (filterButton) {
        fireEvent.click(filterButton);
      }
    });

    // Should show filter options
    const allFilter = screen.getByText(/todas/i) ||
                     screen.getByTestId('filter-all');
    const unreadFilter = screen.getByText(/não lidas/i) ||
                        screen.getByTestId('filter-unread');
    
    expect(allFilter || unreadFilter).toBeInTheDocument();
  });

  it('should allow marking notifications as read', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          notifications: mockNotifications,
          total: 2,
          unreadCount: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const markAllReadButton = screen.getByText(/marcar todas como lidas/i) ||
                               screen.getByTestId('mark-all-read');
      if (markAllReadButton) {
        fireEvent.click(markAllReadButton);
      }
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('markAsRead'),
        })
      );
    });
  });

  it('should close when clicking outside', () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    // Click outside to close
    fireEvent.click(document.body);
    
    // Popover should close (implementation dependent)
    expect(screen.queryByText('Orçamento excedido')).not.toBeInTheDocument();
  });

  it('should handle notification actions', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button') ||
                      screen.getByTestId('notification-bell');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      // Look for action buttons within notifications
      const actionButtons = screen.getAllByRole('button');
      expect(actionButtons.length).toBeGreaterThan(1); // Bell button + action buttons
    });
  });
});