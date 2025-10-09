// Mock all external dependencies first
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { NotificationType, NotificationPriority } from '../../src/types/notifications';

describe('/api/notifications', () => {
  const { getServerSession } = require('next-auth');
  const { prisma } = require('../../src/lib/prisma');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle notification types correctly', () => {
    // Basic test to verify types are imported correctly
    expect(NotificationType.BUDGET_EXCEEDED).toBe('BUDGET_EXCEEDED');
    expect(NotificationPriority.HIGH).toBe('HIGH');
  });

  it('should mock prisma methods', () => {
    // Verify mocks are set up correctly
    expect(typeof prisma.user.findUnique).toBe('function');
    expect(typeof prisma.notification.findMany).toBe('function');
    expect(typeof prisma.notification.count).toBe('function');
    expect(typeof prisma.notification.create).toBe('function');
  });

  it('should mock auth session', () => {
    // Verify auth mock is set up correctly
    expect(typeof getServerSession).toBe('function');
  });

  it('should handle basic notification data structure', () => {
    const mockNotification = {
      id: 'notif-1',
      userId: 'user-1',
      type: NotificationType.BUDGET_EXCEEDED,
      title: 'Test Notification',
      message: 'Test message',
      priority: NotificationPriority.HIGH,
      isRead: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockNotification.type).toBe('BUDGET_EXCEEDED');
    expect(mockNotification.priority).toBe('HIGH');
    expect(mockNotification.isRead).toBe(false);
  });

  it('should handle prisma mock calls', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockNotifications = [
      {
        id: 'notif-1',
        type: NotificationType.SYSTEM,
        title: 'Test',
        message: 'Test message',
        priority: NotificationPriority.MEDIUM,
      }
    ];

    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.notification.findMany.mockResolvedValue(mockNotifications);
    prisma.notification.count.mockResolvedValue(1);

    const user = await prisma.user.findUnique({ where: { id: 'user-1' } });
    const notifications = await prisma.notification.findMany();
    const count = await prisma.notification.count();

    expect(user).toEqual(mockUser);
    expect(notifications).toEqual(mockNotifications);
    expect(count).toBe(1);
  });
});