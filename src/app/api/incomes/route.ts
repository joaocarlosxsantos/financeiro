/**
 * Incomes API Endpoint
 * 
 * @route GET /api/incomes
 * @route POST /api/incomes
 * 
 * @description Gerencia ganhos (pontuais e recorrentes) do usuário
 * 
 * GET: Retorna lista paginada de ganhos
 * POST: Cria novo ganho
 * 
 * ===== GET /api/incomes =====
 * 
 * @param {Object} query - Query parameters
 * @param {string} [query.page] - Número da página (padrão: 1)
 * @param {string} [query.perPage] - Itens por página, máx 200 (padrão: 50)
 * @param {string} [query.start] - Data inicial (YYYY-MM-DD ou DD/MM/YYYY)
 * @param {string} [query.end] - Data final (YYYY-MM-DD ou DD/MM/YYYY)
 * @param {string} [query.type] - PUNCTUAL | RECURRING
 * @param {string} [query.walletId] - ID da carteira (CSV suportado)
 * @param {string} [query.categoryId] - ID da categoria
 * @param {string} [query.q] - Busca por descrição
 * @param {string} [query.minAmount] - Valor mínimo
 * @param {string} [query.maxAmount] - Valor máximo
 * 
 * @returns {Object} Objeto com array de ganhos e paginação
 * 
 * @example
 * // Ganhos do mês atual
 * GET /api/incomes?start=2025-10-01&end=2025-10-31
 * 
 * ===== POST /api/incomes =====
 * 
 * @param {Object} body - Dados do ganho
 * @param {string} body.description - Descrição
 * @param {number} body.amount - Valor
 * @param {string} body.date - Data (YYYY-MM-DD)
 * @param {string} body.walletId - ID da carteira
 * @param {string} body.categoryId - ID da categoria
 * @param {string} [body.type] - PUNCTUAL (padrão) ou RECURRING
 * 
 * @throws {401} Não autenticado
 * @throws {400} Validação falhou
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Schema de validação para query parameters
const IncomesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).optional().nullable(),
  perPage: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(200)).optional().nullable(),
  start: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/)).optional().nullable(),
  end: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/)).optional().nullable(),
  type: z.enum(['RECURRING', 'PUNCTUAL']).optional().nullable(),
  walletId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  q: z.string().optional().nullable(),
  minAmount: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
  maxAmount: z.string().regex(/^\d+(\.\d+)?$/).optional().nullable(),
});

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
  if (!session?.user?.email) {
    logger.warn('Tentativa de acesso não autenticado em /api/incomes');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    logger.warn('Usuário não encontrado durante acesso a /api/incomes', { email: session.user.email });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  
  // Validar query parameters com Zod
  const queryParams = {
    page: url.searchParams.get('page'),
    perPage: url.searchParams.get('perPage'),
    start: url.searchParams.get('start'),
    end: url.searchParams.get('end'),
    type: url.searchParams.get('type'),
    walletId: url.searchParams.get('walletId'),
    categoryId: url.searchParams.get('categoryId'),
    q: url.searchParams.get('q'),
    minAmount: url.searchParams.get('minAmount'),
    maxAmount: url.searchParams.get('maxAmount'),
  };

  const validationResult = IncomesQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError('Validação falhou em /api/incomes', validationResult.error.flatten().fieldErrors, {
      userId: user.id,
    });
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: validationResult.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { page: pageParam = '1', perPage: perPageParam = '50', start, end, type, walletId, categoryId, q, minAmount, maxAmount } = validationResult.data;
  const page = Number(pageParam);
  const perPage = Number(perPageParam);

  const where: any = { userId: user.id };
  if (type) where.type = type as any;
  const startD = start ? parseFlexibleDate(start) : undefined;
  const endD = end ? parseFlexibleDate(end) : undefined;
  if ((!type || type === 'PUNCTUAL') && startD && endD) {
    where.date = { gte: startD, lte: endD };
  }
  if (type === 'RECURRING' && startD && endD) {
    where.AND = [
      { OR: [{ startDate: null }, { startDate: { lte: endD } }] },
      { OR: [{ endDate: null }, { endDate: { gte: startD } }] },
    ];
  }
  // Adicionar filtro por carteira, se informado. Suporta CSV (várias carteiras)
  if (walletId) {
    if (walletId.includes(',')) {
      const ids = walletId.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) where.walletId = { in: ids } as any;
    } else {
      where.walletId = walletId;
    }
  }

  // Optional filters
  if (categoryId) where.categoryId = categoryId;
  if (q) where.description = { contains: q, mode: 'insensitive' } as any;

  // Amount range filters
  if (minAmount || maxAmount) {
    where.amount = {} as any;
    if (minAmount) where.amount.gte = Number(minAmount);
    if (maxAmount) where.amount.lte = Number(maxAmount);
  }
  // Pagination for PUNCTUAL or when not expanding RECURRING occurrences
  if (!type || type === 'PUNCTUAL') {
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
  // Se for RECURRING e foram informadas datas, expandir em instâncias mensais dentro do período
  if (type === 'RECURRING' && startD && endD) {
    const recurringRecords = await prisma.income.findMany({ where, include: { category: true, wallet: true } });
    const expanded: any[] = [];
    for (const i of recurringRecords) {
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
    type: z.enum(['RECURRING', 'PUNCTUAL']),
    paymentType: z.enum(['DEBIT', 'PIX_TRANSFER', 'CASH', 'OTHER']).optional(),
    isRecurring: z.boolean().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    dayOfMonth: z.number().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    walletId: z.string().min(1, 'Carteira é obrigatória'),
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
    isRecurring = false,
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
  const created = await prisma.income.findUnique({ 
    where: { id: income.id }, 
    include: { 
      category: true, 
      wallet: true
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
