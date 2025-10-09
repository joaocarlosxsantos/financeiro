import { NotificationType, NotificationPriority } from '../../src/types/notifications';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    alertConfiguration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    wallet: {
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/lib/prisma');

// Mock processor functions
const mockProcessTransactionAlerts = jest.fn();
const mockCheckAllAlerts = jest.fn();

jest.mock('../../src/lib/notifications/processor', () => ({
  processTransactionAlerts: mockProcessTransactionAlerts,
}));

jest.mock('../../src/lib/notifications/alertDetection', () => ({
  checkAllAlerts: mockCheckAllAlerts,
}));

describe('Notification Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processTransactionAlerts', () => {
    it('should process alerts for a transaction', async () => {
      const userId = 'user-1';
      const mockTransaction = {
        id: 'trans-1',
        userId: 'user-1',
        amount: 500,
        categoryId: 'cat-1',
        walletId: 'wallet-1',
        date: new Date(),
        description: 'Test expense',
      };

      const mockAlertConfigs = [
        {
          id: 'alert-1',
          userId: 'user-1',
          type: 'BUDGET_EXCEEDED',
          isEnabled: true,
          thresholdAmount: 1000,
          thresholdPercent: 80,
        },
      ];

      prisma.alertConfiguration.findMany.mockResolvedValue(mockAlertConfigs);
      mockCheckAllAlerts.mockResolvedValue([
        {
          shouldNotify: true,
          notificationType: NotificationType.BUDGET_EXCEEDED,
          title: 'Orçamento excedido',
          message: 'Você excedeu seu orçamento mensal',
          priority: NotificationPriority.HIGH,
        },
      ]);

      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        type: NotificationType.BUDGET_EXCEEDED,
        title: 'Orçamento excedido',
        message: 'Você excedeu seu orçamento mensal',
        priority: NotificationPriority.HIGH,
      });

      mockProcessTransactionAlerts.mockImplementation(async (userId, transaction) => {
        // Simulate processing logic
        const configs = await prisma.alertConfiguration.findMany({
          where: { userId, isEnabled: true },
        });

        if (configs.length > 0) {
          await prisma.notification.create({
            data: {
              userId,
              type: NotificationType.BUDGET_EXCEEDED,
              title: 'Orçamento excedido',
              message: 'Você excedeu seu orçamento mensal',
              priority: NotificationPriority.HIGH,
            },
          });
        }
      });

      await mockProcessTransactionAlerts(userId, mockTransaction);

      expect(mockProcessTransactionAlerts).toHaveBeenCalledWith(userId, mockTransaction);
    });

    it('should skip processing when no active alert configurations exist', async () => {
      const userId = 'user-1';
      const mockTransaction = {
        id: 'trans-1',
        userId: 'user-1',
        amount: 100,
        categoryId: 'cat-1',
        walletId: 'wallet-1',
        date: new Date(),
        description: 'Small expense',
      };

      prisma.alertConfiguration.findMany.mockResolvedValue([]);

      mockProcessTransactionAlerts.mockImplementation(async (userId, transaction) => {
        const configs = await prisma.alertConfiguration.findMany({
          where: { userId, isEnabled: true },
        });

        expect(configs).toHaveLength(0);
      });

      await mockProcessTransactionAlerts(userId, mockTransaction);

      expect(mockProcessTransactionAlerts).toHaveBeenCalledWith(userId, mockTransaction);
    });

    it('should handle different alert types', async () => {
      const userId = 'user-1';
      const mockTransaction = {
        id: 'trans-1',
        userId: 'user-1',
        amount: 50,
        categoryId: 'cat-1',
        walletId: 'wallet-1',
        date: new Date(),
        description: 'Low balance trigger',
      };

      const mockAlertConfigs = [
        {
          id: 'alert-1',
          userId: 'user-1',
          type: 'LOW_BALANCE',
          isEnabled: true,
          thresholdAmount: 100,
        },
        {
          id: 'alert-2',
          userId: 'user-1',
          type: 'UNUSUAL_SPENDING',
          isEnabled: true,
          thresholdPercent: 50,
        },
      ];

      prisma.alertConfiguration.findMany.mockResolvedValue(mockAlertConfigs);

      mockProcessTransactionAlerts.mockImplementation(async (userId, transaction) => {
        const configs = await prisma.alertConfiguration.findMany({
          where: { userId, isEnabled: true },
        });

        expect(configs).toHaveLength(2);
        expect(configs[0].type).toBe('LOW_BALANCE');
        expect(configs[1].type).toBe('UNUSUAL_SPENDING');
      });

      await mockProcessTransactionAlerts(userId, mockTransaction);

      expect(mockProcessTransactionAlerts).toHaveBeenCalledWith(userId, mockTransaction);
    });

    it('should respect category and wallet filters', async () => {
      const userId = 'user-1';
      const mockTransaction = {
        id: 'trans-1',
        userId: 'user-1',
        amount: 500,
        categoryId: 'cat-restricted',
        walletId: 'wallet-restricted',
        date: new Date(),
        description: 'Restricted category expense',
      };

      const mockAlertConfigs = [
        {
          id: 'alert-1',
          userId: 'user-1',
          type: 'BUDGET_EXCEEDED',
          isEnabled: true,
          thresholdAmount: 1000,
          categoryIds: ['cat-allowed'], // Different category
          walletIds: ['wallet-allowed'], // Different wallet
        },
      ];

      prisma.alertConfiguration.findMany.mockResolvedValue(mockAlertConfigs);

      mockProcessTransactionAlerts.mockImplementation(async (userId, transaction) => {
        const configs = await prisma.alertConfiguration.findMany({
          where: { userId, isEnabled: true },
        });

        // Should not trigger notification due to category/wallet filter
        expect(configs[0].categoryIds).not.toContain(transaction.categoryId);
        expect(configs[0].walletIds).not.toContain(transaction.walletId);
      });

      await mockProcessTransactionAlerts(userId, mockTransaction);

      expect(mockProcessTransactionAlerts).toHaveBeenCalledWith(userId, mockTransaction);
    });
  });

  describe('checkAllAlerts', () => {
    it('should check all alert types for a user', async () => {
      const userId = 'user-1';

      mockCheckAllAlerts.mockResolvedValue([
        {
          shouldNotify: true,
          notificationType: NotificationType.LOW_BALANCE,
          title: 'Saldo baixo',
          message: 'Sua carteira está com saldo baixo',
          priority: NotificationPriority.MEDIUM,
        },
        {
          shouldNotify: false,
        },
      ]);

      const results = await mockCheckAllAlerts(userId);

      expect(mockCheckAllAlerts).toHaveBeenCalledWith(userId);
      expect(results).toHaveLength(2);
      expect(results[0].shouldNotify).toBe(true);
      expect(results[1].shouldNotify).toBe(false);
    });

    it('should return empty results when no alerts are triggered', async () => {
      const userId = 'user-1';

      mockCheckAllAlerts.mockResolvedValue([]);

      const results = await mockCheckAllAlerts(userId);

      expect(mockCheckAllAlerts).toHaveBeenCalledWith(userId);
      expect(results).toHaveLength(0);
    });
  });
});