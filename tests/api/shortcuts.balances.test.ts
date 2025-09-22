const mockedPrisma = {
  income: { groupBy: jest.fn() },
  expense: { groupBy: jest.fn() },
  wallet: { findMany: jest.fn() },
  user: { findUnique: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockedPrisma }));

describe('GET /api/shortcuts/balances', () => {
  beforeEach(() => {
    mockedPrisma.income.groupBy.mockReset();
    mockedPrisma.expense.groupBy.mockReset();
    mockedPrisma.wallet.findMany.mockReset();
    mockedPrisma.user.findUnique.mockReset();
  });

  it('returns balances for wallets', async () => {
    // Mock wallets with incomes and expenses (no precomputed balance)
    mockedPrisma.wallet.findMany.mockResolvedValue([
      {
        id: 'w1',
        name: 'Carteira',
        type: 'carteira',
        incomes: [{ amount: 200, date: new Date().toISOString(), isFixed: false }],
        expenses: [{ amount: 50, date: new Date().toISOString(), isFixed: false }],
      },
    ]);
  mockedPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'user@example.com' });

    // isolate module and provide a minimal mock for next/server to avoid environment globals
    let GET: any;
    await jest.isolateModulesAsync(async () => {
      // Prevent next/server and next-auth from loading real implementations (and ESM deps)
      jest.doMock('next/server', () => ({
        NextRequest: class {},
        NextResponse: class {
          constructor(public body: any) {}
          static json(d: any) {
            return new (this as any)(d);
          }
          json() {
            return Promise.resolve(this.body);
          }
        },
      }));

      // Mock next-auth to avoid loading its internal ESM dependencies (jose, openid-client)
      jest.doMock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue({ user: { email: 'user@example.com' } }),
      }));

      // Provide a minimal authOptions export expected by the route import
      jest.doMock('@/lib/auth', () => ({ authOptions: {} }));

      // Mock apikey helper used by the route; return null so session path is used
      jest.doMock('@/lib/apikey', () => ({ getUserByApiKeyFromHeader: jest.fn().mockResolvedValue(null) }));

      const mod = await import('@/app/api/shortcuts/balances/route');
      GET = mod.GET;
    });

    // build a minimal req object similar to NextRequest (handler only uses headers and session)
    const req: any = { headers: new Map(), url: 'http://localhost' };

    const res = await GET(req as any);
    const json = await res.json();

    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(1);
    expect(json[0]).toMatchObject({ id: 'w1', name: 'Carteira', type: 'carteira', balance: 150 });
  });
});
