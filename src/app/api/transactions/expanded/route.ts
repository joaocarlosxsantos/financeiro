import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// import { logger } from '@/lib/logger';
import { isTransferCategory } from '@/lib/transaction-filters';

const ExpandedTransactionsQuerySchema = z.object({
  type: z.enum(['expense', 'income'], { errorMap: () => ({ message: 'type deve ser "expense" ou "income"' }) }),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de from deve ser YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de to deve ser YYYY-MM-DD'),
  categoryIds: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  walletId: z.string().nullable().optional(),
  sort: z.enum(['date_asc', 'date_desc', 'amount_asc', 'amount_desc']).optional().default('date_desc'),
  page: z.string().nullable().optional().default('1'),
  limit: z.string().nullable().optional().default('100'),
});

type QueryParams = z.infer<typeof ExpandedTransactionsQuerySchema>;

interface ExpandedTransaction {
  id: string;
  originalId: string;
  description: string;
  amount: string;
  date: string;
  type: 'PUNCTUAL' | 'RECURRING';
  category: {
    id: string;
    name: string;
    color: string;
    icon?: string | null;
  } | null;
  wallet: {
    id: string;
    name: string;
    type: string;
  };
  tags: string[];
  paymentType: string;
  transferId: string | null;
  isRecurringExpanded: boolean;
  recurringInfo?: {
    dayOfMonth: number;
    originalStartDate: string | null;
    originalEndDate: string | null;
    occurrenceMonth: string;
  };
  createdAt: string;
  updatedAt: string;
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateExpandedId(originalId: string, year: number, month: number): string {
  return `exp_${originalId}_${year}${String(month).padStart(2, '0')}`;
}

function expandRecurringTransaction(
  transaction: any,
  fromDate: Date,
  toDate: Date,
  isExpense: boolean
): ExpandedTransaction[] {
  if (!transaction.dayOfMonth) return [];

  const expanded: ExpandedTransaction[] = [];
  const dayOfMonth = transaction.dayOfMonth;

  // Começar do primeiro mês do período
  let currentYear = fromDate.getFullYear();
  let currentMonth = fromDate.getMonth() + 1;
  const endYear = toDate.getFullYear();
  const endMonth = toDate.getMonth() + 1;

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    // Verificar se a recorrência ainda está ativa neste mês
    if (transaction.startDate) {
      const startDate = new Date(transaction.startDate);
      const checkDate = new Date(currentYear, currentMonth - 1, 1);
      if (checkDate < startDate) {
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
        continue;
      }
    }

    if (transaction.endDate) {
      const endDate = new Date(transaction.endDate);
      const checkDate = new Date(currentYear, currentMonth - 1, dayOfMonth);
      if (checkDate > endDate) {
        break;
      }
    }

    // Criar data da ocorrência
    const occurrenceDate = new Date(Date.UTC(currentYear, currentMonth - 1, dayOfMonth));

    // Verificar se está dentro do período solicitado
    if (occurrenceDate >= fromDate && occurrenceDate <= toDate) {
      expanded.push({
        id: generateExpandedId(transaction.id, currentYear, currentMonth),
        originalId: transaction.id,
        description: transaction.description,
        amount: transaction.amount.toString(),
        date: formatDate(occurrenceDate),
        type: 'RECURRING',
        category: transaction.category,
        wallet: transaction.wallet,
        tags: transaction.tags || [],
        paymentType: transaction.paymentType,
        transferId: transaction.transferId,
        isRecurringExpanded: true,
        recurringInfo: {
          dayOfMonth,
          originalStartDate: transaction.startDate ? formatDate(new Date(transaction.startDate)) : null,
          originalEndDate: transaction.endDate ? formatDate(new Date(transaction.endDate)) : null,
          occurrenceMonth: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
        },
        createdAt: new Date(transaction.createdAt).toISOString(),
        updatedAt: new Date(transaction.updatedAt).toISOString(),
      });
    }

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return expanded;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    // logger.warn('Unauthorized access attempt to /api/transactions/expanded');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryParams = {
    type: searchParams.get('type'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
    categoryIds: searchParams.get('categoryIds'),
    tags: searchParams.get('tags'),
    walletId: searchParams.get('walletId'),
    sort: searchParams.get('sort'),
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  };

  const validationResult = ExpandedTransactionsQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    // logger.validationError(
    //   'Validation failed in /api/transactions/expanded',
    //   validationResult.error.flatten().fieldErrors,
    //   { email: session.user.email }
    // );
    return NextResponse.json(
      { error: 'Invalid parameters', details: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { type, from, to, categoryIds, tags, walletId, sort, page: pageStr, limit: limitStr } = validationResult.data;
  const page = Math.max(1, Number(pageStr || '1') || 1);
  const limit = Math.min(500, Math.max(1, Number(limitStr || '100') || 100));

  try {
    const fromDate = parseDate(from);
    const toDate = new Date(parseDate(to).getTime() + 86400000 - 1); // Fim do dia

    const isExpense = type === 'expense';
    const model = isExpense ? prisma.expense : prisma.income;

    // Construir where base
    const whereBase: any = {
      user: { email: session.user.email },
      transferId: null,
    };

    // Filtrar por categorias
    if (categoryIds) {
      const ids = categoryIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        whereBase.categoryId = { in: ids };
      }
    }

    // Filtrar por tags
    if (tags) {
      const tagList = tags.split(',').map((s) => s.trim()).filter(Boolean);
      if (tagList.length > 0) {
        whereBase.tags = { hasSome: tagList };
      }
    }

    // Filtrar por carteira
    if (walletId) {
      whereBase.walletId = walletId;
    }

    // Buscar PUNCTUAL
    const punctualWhere = {
      ...whereBase,
      type: 'PUNCTUAL',
      date: { gte: fromDate, lte: toDate },
    };

    const punctual = await model.findMany({
      where: punctualWhere,
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        wallet: { select: { id: true, name: true, type: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Buscar RECURRING
    const recurringWhere = {
      ...whereBase,
      type: 'RECURRING',
    };

    const recurring = await model.findMany({
      where: recurringWhere,
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        wallet: { select: { id: true, name: true, type: true } },
      },
    });

    // Expandir RECURRING
    const expandedRecurring: ExpandedTransaction[] = [];
    for (const rec of recurring) {
      // Filtrar por categoria já foi feito no whereBase
      // Filtrar por tags já foi feito no whereBase
      const expanded = expandRecurringTransaction(rec, fromDate, toDate, isExpense);
      expandedRecurring.push(...expanded);
    }

    // Converter PUNCTUAL para ExpandedTransaction
    const punctualFormatted: ExpandedTransaction[] = punctual.map((p: any) => ({
      id: p.id,
      originalId: p.id,
      description: p.description,
      amount: p.amount.toString(),
      date: formatDate(p.date),
      type: 'PUNCTUAL',
      category: p.category,
      wallet: p.wallet,
      tags: p.tags || [],
      paymentType: p.paymentType,
      transferId: p.transferId,
      isRecurringExpanded: false,
      createdAt: new Date(p.createdAt).toISOString(),
      updatedAt: new Date(p.updatedAt).toISOString(),
    }));

    // Combinar e filtrar transferências
    let all: ExpandedTransaction[] = [...punctualFormatted, ...expandedRecurring];

    // Remover transferências
    all = all.filter((t) => !isTransferCategory(t.category));

    // Ordenação
    switch (sort) {
      case 'date_asc':
        all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'date_desc':
        all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'amount_asc':
        all.sort((a, b) => Number(a.amount) - Number(b.amount));
        break;
      case 'amount_desc':
        all.sort((a, b) => Number(b.amount) - Number(a.amount));
        break;
    }

    // Paginação
    const total = all.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);

    // logger.apiRequest('GET', '/api/transactions/expanded', session.user.email, {
    //   type,
    //   from,
    //   to,
    //   categoryIds,
    //   tags,
    //   walletId,
    //   total,
    //   page,
    //   limit,
    // });

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
  // logger.error('Error in /api/transactions/expanded', error, { email: session.user.email });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
