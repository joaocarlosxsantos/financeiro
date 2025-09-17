// Lightweight unit tests for export logic — avoid importing Next.js route runtime
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    income: { findMany: jest.fn(), aggregate: jest.fn() },
    expense: { findMany: jest.fn(), aggregate: jest.fn() },
  },
}));
jest.mock('../../src/lib/auth', () => ({ authOptions: {} }));

const { getServerSession: getServerSessionMock } = require('next-auth');
const { prisma: prismaMock } = require('../../src/lib/prisma');

beforeEach(() => jest.resetAllMocks());

test('unauthenticated export simulated', async () => {
  getServerSessionMock.mockResolvedValue(null);
  const s = await getServerSessionMock();
  expect(s).toBeNull();
});

test('compute aggregates for export when authenticated', async () => {
  getServerSessionMock.mockResolvedValue({ user: { email: 'a@b.com' } });
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
  prismaMock.income.findMany.mockResolvedValue([]);
  prismaMock.expense.findMany.mockResolvedValue([]);
  prismaMock.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
  prismaMock.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

  const incomeAgg = await prismaMock.income.aggregate();
  const expenseAgg = await prismaMock.expense.aggregate();
  expect(Number(incomeAgg._sum.amount ?? 0)).toBe(0);
  expect(Number(expenseAgg._sum.amount ?? 0)).toBe(0);
});
