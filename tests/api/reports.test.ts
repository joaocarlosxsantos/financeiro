// Ensure mocks are registered before importing the route handler to avoid loading ESM-only dependencies
const mockSession = { user: { email: 'a@b.com' } };

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    income: { findMany: jest.fn(), aggregate: jest.fn(), count: jest.fn() },
    expense: { findMany: jest.fn(), aggregate: jest.fn(), count: jest.fn() },
  },
}));

// Mock authOptions import to avoid loading src/lib/auth which pulls ESM packages
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

let GET: any;

describe('GET /api/reports', () => {
  beforeAll(async () => {
    // dynamic import after mocks
    const mod = await import('../../src/app/api/reports/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new Request('http://localhost/api/reports');
    const res = await GET(req as any);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBeDefined();
  });

  it('returns data when authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });

    (prisma.income.findMany as jest.Mock).mockResolvedValue([
      { id: 'i1', description: 'income1', amount: 100, date: new Date().toISOString(), category: null, wallet: null },
    ]);
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([
      { id: 'e1', description: 'expense1', amount: 50, date: new Date().toISOString(), category: null, wallet: null },
    ]);
    (prisma.income.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 100 } });
    (prisma.expense.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 50 } });
    (prisma.income.count as jest.Mock).mockResolvedValue(1);
    (prisma.expense.count as jest.Mock).mockResolvedValue(1);

    const req = new Request('http://localhost/api/reports');
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.totals).toEqual({ incomes: 100, expenses: 50, net: 50 });
  });
});
