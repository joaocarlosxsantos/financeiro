/**
 * Transactions API Endpoint
 * 
 * @route POST /api/transactions
 * 
 * @description Endpoint unificado para criar transações (expenses ou incomes)
 * 
 * POST: Cria nova transação na tabela apropriada baseada em transactionType
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parseInputDateBrasilia, createBrasiliaDate } from '@/lib/datetime-brasilia';
import { withUserRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 });
  }

  // Apply rate limiting
  const rateLimitResponse = await withUserRateLimit(req, user.id, RATE_LIMITS.TRANSACTIONS_CREATE);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json();
  
  // Schema de validação
  const transactionSchema = z.object({
    transactionType: z.enum(['expense', 'income'], {
      required_error: 'transactionType é obrigatório (expense ou income)',
    }),
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.union([z.number(), z.string()]).transform(val => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num <= 0) {
        throw new Error('Valor deve ser positivo');
      }
      return num;
    }),
    date: z.string().optional(),
    type: z.enum(['RECURRING', 'PUNCTUAL']).optional(),
    paymentType: z.enum(['DEBIT', 'CREDIT', 'PIX_TRANSFER', 'CASH', 'OTHER']).optional(),
    recurring: z.boolean().optional(),
    isRecurring: z.boolean().optional(),
    recurringStart: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    recurringEnd: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    dayOfMonth: z.number().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    walletId: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
  });

  const parse = transactionSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.issues.map(e => e.message).join(', ') },
      { status: 400 }
    );
  }

  const {
    transactionType,
    description,
    amount,
    date,
    type,
    paymentType = 'DEBIT',
    recurring,
    isRecurring,
    recurringStart,
    startDate,
    recurringEnd,
    endDate,
    dayOfMonth,
    categoryId,
    walletId,
    tags = [],
    tagIds = [],
  } = parse.data;

  // Validar que carteira é obrigatória
  if (!walletId) {
    return NextResponse.json({ error: 'Carteira é obrigatória' }, { status: 400 });
  }

  // Determinar valores recorrentes
  const finalIsRecurring = isRecurring ?? recurring ?? false;
  const finalStartDate = startDate ?? recurringStart;
  const finalEndDate = endDate ?? recurringEnd;
  const finalType = type ?? (finalIsRecurring ? 'RECURRING' : 'PUNCTUAL');
  
  // Processar tags
  let tagNames: string[] = [];
  if (tagIds.length > 0) {
    const tagsFromDb = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        userId: user.id,
      },
      select: { name: true },
    });
    tagNames = tagsFromDb.map(t => t.name);
  } else if (tags.length > 0) {
    tagNames = tags;
  }

  // Criar na tabela apropriada
  try {
    if (transactionType === 'expense') {
      const expense = await prisma.expense.create({
        data: {
          description,
          amount,
          date: date ? (parseFlexibleDate(date) ?? new Date()) : new Date(),
          type: finalType,
          paymentType,
          isRecurring: finalIsRecurring,
          startDate: finalStartDate ? parseFlexibleDate(finalStartDate) : undefined,
          endDate: finalEndDate ? parseFlexibleDate(finalEndDate) : undefined,
          dayOfMonth,
          categoryId,
          walletId,
          userId: user.id,
          tags: tagNames,
        },
      });

      const created = await prisma.expense.findUnique({
        where: { id: expense.id },
        include: {
          category: true,
          wallet: true,
        },
      });

      // Process notifications
      try {
        const { processTransactionAlerts } = await import('@/lib/notifications/processor');
        await processTransactionAlerts(user.id, 'expense');
      } catch (error) {
        console.error('Erro ao processar alertas de despesa:', error);
      }

      return NextResponse.json(created, { status: 201 });
    } else {
      // income
      const income = await prisma.income.create({
        data: {
          description,
          amount,
          date: date ? (parseFlexibleDate(date) ?? new Date()) : new Date(),
          type: finalType,
          paymentType,
          isRecurring: finalIsRecurring,
          startDate: finalStartDate ? parseFlexibleDate(finalStartDate) : undefined,
          endDate: finalEndDate ? parseFlexibleDate(finalEndDate) : undefined,
          dayOfMonth,
          categoryId,
          walletId,
          userId: user.id,
          tags: tagNames,
        },
      });

      const created = await prisma.income.findUnique({
        where: { id: income.id },
        include: {
          category: true,
          wallet: true,
        },
      });

      // Process notifications
      try {
        const { processTransactionAlerts } = await import('@/lib/notifications/processor');
        await processTransactionAlerts(user.id, 'income');
      } catch (error) {
        console.error('Erro ao processar alertas de renda:', error);
      }

      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return NextResponse.json(
      { error: 'Erro ao criar transação' },
      { status: 500 }
    );
  }
}
