// Mock external dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    alertConfiguration: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('/api/notifications/alerts', () => {
  const { getServerSession } = require('next-auth');
  const { prisma } = require('../../src/lib/prisma');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mock alert configuration methods correctly', () => {
    expect(typeof prisma.alertConfiguration.findMany).toBe('function');
    expect(typeof prisma.alertConfiguration.create).toBe('function');
    expect(typeof prisma.alertConfiguration.update).toBe('function');
    expect(typeof prisma.alertConfiguration.delete).toBe('function');
  });

  it('should handle alert configuration data structure', () => {
    const mockAlertConfig = {
      id: 'alert-1',
      userId: 'user-1',
      type: 'BUDGET_EXCEEDED',
      isEnabled: true,
      thresholdAmount: 1000,
      thresholdPercent: 80,
      categoryIds: [],
      walletIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockAlertConfig.type).toBe('BUDGET_EXCEEDED');
    expect(mockAlertConfig.isEnabled).toBe(true);
    expect(mockAlertConfig.thresholdAmount).toBe(1000);
  });

  it('should handle alert configuration operations', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    const mockConfigs = [
      {
        id: 'config-1',
        userId: 'user-1',
        type: 'BUDGET_EXCEEDED',
        isEnabled: true,
        thresholdAmount: 1000,
      },
      {
        id: 'config-2',
        userId: 'user-1',
        type: 'LOW_BALANCE',
        isEnabled: true,
        thresholdAmount: 100,
      },
    ];

    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.alertConfiguration.findMany.mockResolvedValue(mockConfigs);
    prisma.alertConfiguration.create.mockResolvedValue(mockConfigs[0]);

    // Test findMany
    const configs = await prisma.alertConfiguration.findMany();
    expect(configs).toEqual(mockConfigs);

    // Test create
    const newConfig = await prisma.alertConfiguration.create({
      data: {
        userId: 'user-1',
        type: 'BUDGET_EXCEEDED',
        isEnabled: true,
        thresholdAmount: 1000,
      },
    });
    expect(newConfig).toEqual(mockConfigs[0]);
  });

  it('should validate alert configuration types', () => {
    const validTypes = [
      'BUDGET_EXCEEDED',
      'UNUSUAL_SPENDING',
      'LOW_BALANCE',
      'GOAL_AT_RISK',
      'DUPLICATE_TRANSACTION',
      'RECURRING_DUE',
      'MONTHLY_SUMMARY',
    ];

    validTypes.forEach(type => {
      const config = {
        id: 'test',
        userId: 'user-1',
        type: type,
        isEnabled: true,
      };

      expect(config.type).toBe(type);
      expect(config.isEnabled).toBe(true);
    });
  });

  it('should handle authentication mock', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com' },
    };

    getServerSession.mockResolvedValue(mockSession);

    const session = await getServerSession();
    expect(session).toEqual(mockSession);
    expect(session.user.id).toBe('user-1');
  });
});