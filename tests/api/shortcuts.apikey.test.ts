jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
// Mock next/server to avoid importing Request/NextResponse implementations that
// require a DOM-like Request global during unit tests.
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, opts?: any) => ({ body, opts }),
  },
}));

// Mock the prisma adapter package (it's distributed as ESM and breaks Jest parsing).
jest.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: jest.fn(() => ({})) }));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    expense: { create: jest.fn(), findUnique: jest.fn() },
    category: { findMany: jest.fn() },
    wallet: { findMany: jest.fn() },
    tag: { findMany: jest.fn() },
  },
}));

const mockedPrisma = require('@/lib/prisma').prisma;

const registerModule = require('../../src/app/api/auth/register/route');
const expensesModule = require('../../src/app/api/shortcuts/expenses/route');

describe('API Key integration (unit-mock)', () => {
  beforeEach(() => jest.resetAllMocks());

  test('register generates apiKey', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
  mockedPrisma.user.create.mockImplementation(async (args: any) => ({ id: 'u1', ...(args.data || {}) }));

    const req = { json: async () => ({ name: 'A', email: 'a@b.com', password: 'p' }) };
    // call the POST handler
    await registerModule.POST(req);
    expect(mockedPrisma.user.create).toHaveBeenCalled();
    const created = mockedPrisma.user.create.mock.calls[0][0].data;
    expect(created).toHaveProperty('apiKey');
    expect(typeof created.apiKey).toBe('string');
  });

  test('authenticate with Bearer apiKey to create expense', async () => {
    // user with apiKey
    mockedPrisma.user.findUnique.mockImplementation(async (args: any) => {
      if (args.where && args.where.apiKey) return { id: 'u1', email: 'a@b.com', apiKey: args.where.apiKey };
      if (args.where && args.where.email) return { id: 'u1', email: args.where.email };
      return null;
    });
    mockedPrisma.expense.create.mockResolvedValue({ id: 'e1' });

    const headerObj: any = { get: (k: any) => (String(k).toLowerCase() === 'authorization' ? 'Bearer mykey' : null) };
    const req: any = {
      headers: headerObj,
      json: async () => ({ description: 'x', amount: 1, type: 'VARIABLE' }),
    };

    await expensesModule.POST(req);
    expect(mockedPrisma.expense.create).toHaveBeenCalled();
  });
});
