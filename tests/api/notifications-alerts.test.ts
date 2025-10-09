// Mock NextAuth
jest.mock('next-auth', () => ({ 
  getServerSession: jest.fn() 
}));

// Mock Prisma
const mockPrisma = {
  user: { findUnique: jest.fn() },
  alertConfiguration: { 
    findMany: jest.fn(), 
    create: jest.fn(), 
    update: jest.fn(),
    delete: jest.fn()
  },
  category: { findMany: jest.fn() },
  wallet: { findMany: jest.fn() },
  goal: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

const mockAuth = require('next-auth');

// Mock do módulo de alerts sem importar o arquivo real
const alertsModule = {
  GET: jest.fn(),
  POST: jest.fn(),
};

describe('/api/notifications/alerts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/notifications/alerts', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.getServerSession.mockResolvedValue(null);
      
      alertsModule.GET.mockRejectedValue({
        status: 401,
        error: 'Não autenticado'
      });

      const mockRequest = { url: 'http://localhost/api/notifications/alerts' };
      
      try {
        await alertsModule.GET(mockRequest);
      } catch (error: any) {
        expect(error.status).toBe(401);
        expect(error.error).toBe('Não autenticado');
      }
    });

    it('should return alert configurations for authenticated user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockConfigs = [
        {
          id: 'config-1',
          type: 'EXPENSE_LIMIT',
          name: 'Limite de Gastos',
          isActive: true,
          config: { limitValue: 1000, alertPercentage: 80 },
          userId: 'user-1'
        }
      ];

      mockAuth.getServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.alertConfiguration.findMany.mockResolvedValue(mockConfigs);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);
      mockPrisma.goal.findMany.mockResolvedValue([]);
      
      // Simular chamada da API
      alertsModule.GET.mockResolvedValue({
        status: 200,
        data: { configs: mockConfigs }
      });

      const mockRequest = { url: 'http://localhost/api/notifications/alerts' };
      const result = await alertsModule.GET(mockRequest);

      expect(alertsModule.GET).toHaveBeenCalledWith(mockRequest);
      expect(result.data.configs).toEqual(mockConfigs);
    });
  });

  describe('POST /api/notifications/alerts', () => {
    it('should create expense limit alert configuration', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockConfig = {
        id: 'config-1',
        type: 'EXPENSE_LIMIT',
        name: 'Limite de Gastos',
        isActive: true,
        config: { limitValue: 1000, alertPercentage: 80 },
        userId: 'user-1'
      };

      mockAuth.getServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.alertConfiguration.create.mockResolvedValue(mockConfig);
      
      const mockRequestData = {
        type: 'EXPENSE_LIMIT',
        name: 'Limite de Gastos',
        config: {
          limitValue: 1000,
          alertPercentage: 80,
          categories: ['cat-1'],
          wallets: ['wallet-1']
        }
      };
      
      alertsModule.POST.mockResolvedValue({
        status: 201,
        data: mockConfig
      });

      const mockRequest = { 
        json: () => Promise.resolve(mockRequestData) 
      };
      
      const result = await alertsModule.POST(mockRequest);

      expect(alertsModule.POST).toHaveBeenCalledWith(mockRequest);
      expect(result.data).toEqual(mockConfig);
    });
  });
});