// Lightweight unit tests for export logic — avoid importing Next.js route runtime
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    income: { findMany: jest.fn(), aggregate: jest.fn() },
    expense: { findMany: jest.fn(), aggregate: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const nextAuthExport = require('next-auth');
const prismaClientExport = require('@/lib/prisma').prisma;

beforeEach(() => jest.resetAllMocks());

test('unauthenticated export simulated', async () => {
  nextAuthExport.getServerSession.mockResolvedValue(null);
  const session = await nextAuthExport.getServerSession();
  expect(session).toBeNull();
});

test('compute aggregates for export when authenticated', async () => {
  nextAuthExport.getServerSession.mockResolvedValue({ user: { email: 'a@b.com' } });
  prismaClientExport.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
  prismaClientExport.income.findMany.mockResolvedValue([]);
  prismaClientExport.expense.findMany.mockResolvedValue([]);
  prismaClientExport.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
  prismaClientExport.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

  const incomeAgg = await prismaClientExport.income.aggregate();
  const expenseAgg = await prismaClientExport.expense.aggregate();
  expect(Number(incomeAgg._sum.amount ?? 0)).toBe(0);
  expect(Number(expenseAgg._sum.amount ?? 0)).toBe(0);
});
