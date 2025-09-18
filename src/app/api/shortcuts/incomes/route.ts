import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserByApiKeyFromHeader } from '@/lib/apikey';
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

async function findUserFromSessionOrApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const userByKey = await getUserByApiKeyFromHeader(authHeader);
    if (userByKey) return userByKey;
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw { status: 401, message: 'Unauthorized' };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

export async function POST(req: NextRequest) {
  try {
  const rawBody = await req.json();
  const body = { ...rawBody };
  if (body.categoryId === '') body.categoryId = null;
  if (body.categoryId === undefined) {
    // leave undefined
  } else if (body.categoryId === null) {
    // explicit null => keep
  } else if (typeof body.categoryId === 'object') {
    if (body.categoryId.placeholder) {
      body.categoryId = null;
    } else if ('id' in body.categoryId) {
      const idVal = body.categoryId.id;
      body.categoryId = (typeof idVal === 'string' && idVal.trim()) ? idVal : null;
    } else if ('name' in body.categoryId) {
      body.categoryId = null;
    } else {
      body.categoryId = null;
    }
  }
  if (Array.isArray(body.tags)) {
    body.tags = body.tags
      .map((t: any) => {
        if (!t) return '';
        if (typeof t === 'string') return t;
        if (t.placeholder) return '';
        return t?.name || t?.id || '';
      })
      .filter(Boolean);
  }
  const user = await findUserFromSessionOrApiKey(req);

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
  // email removed: sessions required
    });

    const parse = incomeSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.issues.map((e) => e.message).join(', ') }, { status: 400 });
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

    const created = await prisma.income.findUnique({ where: { id: income.id }, include: { category: true, wallet: true } });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status });
  }
}
