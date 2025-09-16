// tests for export endpoint
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    income: { findMany: jest.fn(), aggregate: jest.fn() },
    expense: { findMany: jest.fn(), aggregate: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

let GET: any;

beforeAll(async () => {
  const mod = await import('../../src/app/api/reports/export/route');
  GET = mod.GET;
});

beforeEach(() => jest.resetAllMocks());

it('returns 401 when not authenticated (export)', async () => {
  (getServerSession as jest.Mock).mockResolvedValue(null);
  const req = new Request('http://localhost/api/reports/export');
  const res = await GET(req as any);
  const json = await res.json();
  expect(res.status).toBe(401);
  expect(json.error).toBeDefined();
});

it('returns xlsx stream when authenticated', async () => {
  (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'a@b.com' } });
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', email: 'a@b.com' });
  (prisma.income.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.income.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });
  (prisma.expense.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } });

  const req = new Request('http://localhost/api/reports/export');
  const res = await GET(req as any);
  // ensure content-type header for xlsx exists
  const ct = res.headers.get('Content-Type');
  expect(res.status).toBe(200);
  expect(ct).toMatch(/spreadsheetml/);
});
