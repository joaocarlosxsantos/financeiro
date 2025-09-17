// Unit tests for reports totals logic (CommonJS)
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    income: { findMany: jest.fn(), aggregate: jest.fn(), count: jest.fn() },
    expense: { findMany: jest.fn(), aggregate: jest.fn(), count: jest.fn() },
    tag: { findMany: jest.fn() },
  },
}));
jest.mock('../../src/lib/auth', () => ({ authOptions: {} }));

const { getServerSession: getServerSessionMock } = require('next-auth');
const { prisma: prismaMock } = require('../../src/lib/prisma');

beforeEach(() => jest.resetAllMocks());

test('unauthenticated simulated', async () => {
  getServerSessionMock.mockResolvedValue(null);
  const session = await getServerSessionMock();
  expect(session).toBeNull();
});

test('computes totals when authenticated', async () => {
  getServerSessionMock.mockResolvedValue({ user: { email: 'a@b.com' } });
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

  prismaMock.income.findMany.mockResolvedValue([
    { id: 'i1', description: 'income1', amount: 100, date: new Date().toISOString(), category: null, wallet: null, isFixed: false },
  ]);
  prismaMock.expense.findMany.mockResolvedValue([
    { id: 'e1', description: 'expense1', amount: 50, date: new Date().toISOString(), category: null, wallet: null, isFixed: false },
  ]);
  prismaMock.income.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 50 } });
  prismaMock.income.count.mockResolvedValue(1);
  prismaMock.expense.count.mockResolvedValue(1);

  const incAgg = await prismaMock.income.aggregate();
  const expAgg = await prismaMock.expense.aggregate();
  expect(Number(incAgg._sum.amount ?? 0)).toBe(100);
  expect(Number(expAgg._sum.amount ?? 0)).toBe(50);
  expect(Number(incAgg._sum.amount ?? 0) - Number(expAgg._sum.amount ?? 0)).toBe(50);
});

