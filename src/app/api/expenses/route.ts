
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parseInputDateBrasilia, createBrasiliaDate } from '@/lib/datetime-brasilia';

function parseFlexibleDate(input?: string | null): Date | undefined {
  if (!input) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return createBrasiliaDate(y, m, d);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [d, m, y] = input.split('/').map(Number);
    return createBrasiliaDate(y, m, d);
  }
  return parseInputDateBrasilia(input);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const pageParam = Number(url.searchParams.get('page') || '1');
  const perPageParam = Number(url.searchParams.get('perPage') || '50');
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPage = Number.isFinite(perPageParam) && perPageParam > 0 ? Math.min(perPageParam, 200) : 50;
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const type = url.searchParams.get('type'); // RECURRING | PUNCTUAL

  const where: any = { userId: user.id };
  if (type) where.type = type as any;
  const startD = start ? parseFlexibleDate(start) : undefined;
  const endD = end ? parseFlexibleDate(end) : undefined;
  if ((!type || type === 'PUNCTUAL') && startD && endD) {
    where.date = { gte: startD, lte: endD };
  }
  // Filtrar RECURRING ativos no período, se período informado
  if (type === 'RECURRING' && startD && endD) {
    where.AND = [
      {
        OR: [{ startDate: null }, { startDate: { lte: endD } }],
      },
      {
        OR: [{ endDate: null }, { endDate: { gte: startD } }],
      },
    ];
  }
  // Adicionar filtro por carteira, se informado. Suporta CSV (várias carteiras)
  const walletId = url.searchParams.get('walletId');
  if (walletId) {
    if (walletId.includes(',')) {
      const ids = walletId.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) where.walletId = { in: ids } as any;
    } else {
      where.walletId = walletId;
    }
  }
  const categoryId = url.searchParams.get('categoryId');
  if (categoryId) where.categoryId = categoryId;
  const q = url.searchParams.get('q');
  if (q) where.description = { contains: q, mode: 'insensitive' } as any;

  const minAmount = url.searchParams.get('minAmount');
  const maxAmount = url.searchParams.get('maxAmount');
  if (minAmount || maxAmount) {
    where.amount = {} as any;
    if (minAmount) where.amount.gte = Number(minAmount);
    if (maxAmount) where.amount.lte = Number(maxAmount);
  }
  if (!type || type === 'PUNCTUAL') {
    const total = await prisma.expense.count({ where });
    // Ordenar apenas por data (desc). Remover tie-break por createdAt para
    // evitar que atualizações na linha mudem a ordem inesperadamente.
    // Ordenar por date desc e tie-break por id asc para garantir ordem determinística
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      include: { category: true, wallet: true },
      skip: (page - 1) * perPage,
      take: perPage,
    });
    const headers = new Headers();
    headers.set('X-Total-Count', String(total));
    headers.set('X-Page', String(page));
    headers.set('X-Per-Page', String(perPage));
    return NextResponse.json(expenses, { headers });
  }
  // Se for RECURRING e foram informadas datas, expandir em instâncias mensais dentro do período
  if (type === 'RECURRING' && startD && endD) {
    const fixedRecords = await prisma.expense.findMany({ where, include: { category: true, wallet: true } });
    const expanded: any[] = [];
    for (const e of fixedRecords) {
      // Determinar período efetivo da recorrência
      const recStart = e.startDate ?? e.date ?? startD;
      const recEnd = e.endDate ?? endD;
      const from = recStart > startD ? recStart : startD;
      const to = recEnd < endD ? recEnd : endD;
      if (!from || !to) continue;

      // dia do mês para ocorrência (fallback para dia da data original)
      const day = typeof e.dayOfMonth === 'number' && e.dayOfMonth > 0 ? e.dayOfMonth : parseInputDateBrasilia(e.date).getDate();

      // iterar meses entre from e to
      let cur = createBrasiliaDate(from.getFullYear(), from.getMonth() + 1, 1);
      const last = createBrasiliaDate(to.getFullYear(), to.getMonth() + 1, 1);
      while (cur.getTime() <= last.getTime()) {
        const lastDayOfMonth = createBrasiliaDate(cur.getFullYear(), cur.getMonth() + 2, 0).getDate();
        const dayInMonth = Math.min(day, lastDayOfMonth);
        const occDate = createBrasiliaDate(cur.getFullYear(), cur.getMonth() + 1, dayInMonth);
        // garantir dentro do intervalo original (from..to)
        if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
          // clonar objeto e ajustar data (string YYYY-MM-DD usando partes locais para evitar timezone issues)
          const { formatYmd } = await import('@/lib/utils');
          expanded.push({ ...e, date: formatYmd(occDate) });
        }
        cur = createBrasiliaDate(cur.getFullYear(), cur.getMonth() + 2, 1);
      }
    }
    // ordenar por date desc. Se as datas empatarem, aplicar tie-break por id
    // e por ordem de expansão para garantir comportamento determinístico
    expanded.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta !== tb) return tb - ta;
      const ida = String(a.id || '');
      const idb = String(b.id || '');
      const cmp = ida.localeCompare(idb);
      if (cmp !== 0) return cmp;
      // fallback: preserve expansion order if everything else equal
      const oa = (a.__origOrder ?? 0) as number;
      const ob = (b.__origOrder ?? 0) as number;
      return oa - ob;
    });
  const total = expanded.length;
  const startIdx = (page - 1) * perPage;
  const paged = expanded.slice(startIdx, startIdx + perPage);
  const headers = new Headers();
  headers.set('X-Total-Count', String(total));
  headers.set('X-Page', String(page));
  headers.set('X-Per-Page', String(perPage));
  return NextResponse.json(paged, { headers });
  }

  // fallback (não deve acontecer) — retorna lista vazia
  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const expenseSchema = z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.number().positive('Valor deve ser positivo'),
    date: z.string().optional(),
    type: z.enum(['RECURRING', 'PUNCTUAL']),
    paymentType: z.enum(['DEBIT', 'CREDIT', 'PIX_TRANSFER', 'CASH', 'OTHER']).optional(),
    isRecurring: z.boolean().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    dayOfMonth: z.number().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    walletId: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
  });
  const parse = expenseSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues.map(e => e.message).join(', ') }, { status: 400 });
  }
  const {
    description,
    amount,
    date,
    type,
    paymentType = 'DEBIT',
    isRecurring = false,
    startDate,
    endDate,
    dayOfMonth,
    categoryId,
    walletId,
    tags = [],
  } = parse.data;

  // Validar que carteira é obrigatória (sistema não trabalha mais com cartões de crédito na despesa)
  if (!walletId) {
    return NextResponse.json({ error: 'Carteira é obrigatória' }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      description,
      amount,
      date: date ? (parseFlexibleDate(date) ?? new Date()) : new Date(),
      type,
      paymentType,
      isRecurring,
      startDate: startDate ? parseFlexibleDate(startDate) : undefined,
      endDate: endDate ? parseFlexibleDate(endDate) : undefined,
      dayOfMonth,
      categoryId,
      walletId,
      userId: user.id,
      tags,
    },
  });

  // return created item including relations to match client expectations
  const created = await prisma.expense.findUnique({ 
    where: { id: expense.id }, 
    include: { 
      category: true, 
      wallet: true 
    } 
  });
  
  // Process notifications after expense creation
  try {
    const { processTransactionAlerts } = await import('@/lib/notifications/processor');
    await processTransactionAlerts(user.id, 'expense');
  } catch (error) {
    console.error('Erro ao processar alertas de despesa:', error);
    // Don't fail the request if notification processing fails
  }
  
  return NextResponse.json(created, { status: 201 });
}
