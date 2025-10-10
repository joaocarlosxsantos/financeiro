
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
  const pageParam = Number(url.searchParams.get('page') || '1');
  const perPageParam = Number(url.searchParams.get('perPage') || '50');
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPage = Number.isFinite(perPageParam) && perPageParam > 0 ? Math.min(perPageParam, 200) : 50;
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

  // Optional filters
  const categoryId = url.searchParams.get('categoryId');
  if (categoryId) where.categoryId = categoryId;
  const q = url.searchParams.get('q');
  if (q) where.description = { contains: q, mode: 'insensitive' } as any;

  // Amount range filters
  const minAmount = url.searchParams.get('minAmount');
  const maxAmount = url.searchParams.get('maxAmount');
  if (minAmount || maxAmount) {
    where.amount = {} as any;
    if (minAmount) where.amount.gte = Number(minAmount);
    if (maxAmount) where.amount.lte = Number(maxAmount);
  }
  // Pagination for VARIABLE or when not expanding FIXED occurrences
  if (!type || type === 'VARIABLE') {
    const total = await prisma.income.count({ where });
    // Ordenar apenas por data (desc). Remover tie-break por createdAt para
    // evitar que atualizações na linha mudem a ordem inesperadamente.
    // Ordenar por date desc e tie-break por id asc para garantir ordem determinística
    const incomes = await prisma.income.findMany({
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
    return NextResponse.json(incomes, { headers });
  }
  // Se for FIXED e foram informadas datas, expandir em instâncias mensais dentro do período
  if (type === 'FIXED' && startD && endD) {
    const fixedRecords = await prisma.income.findMany({ where, include: { category: true, wallet: true } });
    const expanded: any[] = [];
    for (const i of fixedRecords) {
      const recStart = i.startDate ?? i.date ?? startD;
      const recEnd = i.endDate ?? endD;
      const from = recStart > startD ? recStart : startD;
      const to = recEnd < endD ? recEnd : endD;
      if (!from || !to) continue;
      const day = typeof i.dayOfMonth === 'number' && i.dayOfMonth > 0 ? i.dayOfMonth : new Date(i.date).getDate();
      let cur = new Date(from.getFullYear(), from.getMonth(), 1);
      const last = new Date(to.getFullYear(), to.getMonth(), 1);
      while (cur.getTime() <= last.getTime()) {
        const lastDayOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
        const dayInMonth = Math.min(day, lastDayOfMonth);
        const occDate = new Date(cur.getFullYear(), cur.getMonth(), dayInMonth);
        if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
          // Serializar data como YYYY-MM-DD usando partes locais para evitar shifts de timezone no cliente
          const { formatYmd } = await import('@/lib/utils');
          expanded.push({ ...i, date: formatYmd(occDate) });
        }
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    }
    // ordenar por date desc. Se as datas empatarem, manter a ordem original
    // (stable sort) retornando 0 quando as datas forem iguais.
    expanded.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta === tb) return 0;
      return tb - ta;
    });
    // ordenar por date desc; tie-break por id e por ordem de expansão
    expanded.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta !== tb) return tb - ta;
      const ida = String(a.id || '');
      const idb = String(b.id || '');
      const cmp = ida.localeCompare(idb);
      if (cmp !== 0) return cmp;
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

  // fallback (shouldn't reach here)
  return NextResponse.json([]);
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
    paymentType: z.enum(['DEBIT', 'CREDIT', 'PIX_TRANSFER', 'CASH', 'OTHER']).optional(),
    isFixed: z.boolean().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    dayOfMonth: z.number().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    walletId: z.string().optional().nullable(),
    creditCardId: z.string().optional().nullable(),
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
    paymentType = 'DEBIT',
    isFixed = false,
    startDate,
    endDate,
    dayOfMonth,
    categoryId,
    walletId,
    creditCardId,
    tags = [],
  } = parse.data;

  // Validar que quando for CREDIT, deve ter creditCardId e não walletId
  if (paymentType === 'CREDIT' && !creditCardId) {
    return NextResponse.json({ error: 'Cartão de crédito é obrigatório para pagamento à crédito' }, { status: 400 });
  }
  if (paymentType === 'CREDIT' && walletId) {
    return NextResponse.json({ error: 'Não é possível especificar carteira para pagamento à crédito' }, { status: 400 });
  }
  if (paymentType !== 'CREDIT' && creditCardId) {
    return NextResponse.json({ error: 'Cartão de crédito só pode ser usado para pagamento à crédito' }, { status: 400 });
  }
  if (paymentType !== 'CREDIT' && !walletId) {
    return NextResponse.json({ error: 'Carteira é obrigatória para este tipo de pagamento' }, { status: 400 });
  }

  const income = await prisma.income.create({
    data: {
      description,
      amount,
      date: date ? (parseFlexibleDate(date) ?? new Date()) : new Date(),
      type,
      paymentType,
      isFixed,
      startDate: startDate ? parseFlexibleDate(startDate) : undefined,
      endDate: endDate ? parseFlexibleDate(endDate) : undefined,
      dayOfMonth,
      categoryId,
      walletId: paymentType === 'CREDIT' ? null : walletId,
      creditCardId: paymentType === 'CREDIT' ? creditCardId : null,
      userId: user.id,
      tags,
    },
  });
  const created = await prisma.income.findUnique({ 
    where: { id: income.id }, 
    include: { 
      category: true, 
      wallet: true, 
      creditCard: true 
    } 
  });
  
  // Process notifications after income creation
  try {
    const { processTransactionAlerts } = await import('@/lib/notifications/processor');
    await processTransactionAlerts(user.id, 'income');
  } catch (error) {
    console.error('Erro ao processar alertas de renda:', error);
    // Don't fail the request if notification processing fails
  }
  
  return NextResponse.json(created, { status: 201 });
}
