
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

function parseFlexibleDate(input?: string | null): Date | undefined {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [d, m, y] = input.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  const dt = new Date(input);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const type = url.searchParams.get('type'); // FIXED | VARIABLE

  const where: any = { userId: user.id };
  if (type) where.type = type as any;
  const startD = start ? parseFlexibleDate(start) : undefined;
  const endD = end ? parseFlexibleDate(end) : undefined;
  if ((!type || type === 'VARIABLE') && startD && endD) {
    where.date = { gte: startD, lte: endD };
  }
  if (type === 'FIXED' && startD && endD) {
    where.AND = [
      { OR: [{ startDate: null }, { startDate: { lte: endD } }] },
      { OR: [{ endDate: null }, { endDate: { gte: startD } }] },
    ];
  }
  // Adicionar filtro por carteira, se informado
  const walletId = url.searchParams.get('walletId');
  if (walletId) where.walletId = walletId;

  const incomes = await prisma.income.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { category: true, wallet: true },
  });
  return NextResponse.json(incomes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const incomeSchema = z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.number().positive('Valor deve ser positivo'),
    date: z.string().optional(),
    type: z.enum(['FIXED', 'VARIABLE']),
    isFixed: z.boolean().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    dayOfMonth: z.number().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    walletId: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
  });
  const parse = incomeSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  const {
    description,
    amount,
    date,
    type,
    isFixed = false,
    startDate,
    endDate,
    dayOfMonth,
    categoryId,
    walletId,
    tags = [],
  } = parse.data;

  const income = await prisma.income.create({
    data: {
      description,
      amount,
      date: date ? (parseFlexibleDate(date) ?? new Date()) : new Date(),
      type,
      isFixed,
      startDate: startDate ? parseFlexibleDate(startDate) : undefined,
      endDate: endDate ? parseFlexibleDate(endDate) : undefined,
      dayOfMonth,
      categoryId,
      walletId,
      userId: user.id,
      tags,
    },
  });
  return NextResponse.json(income, { status: 201 });
}
