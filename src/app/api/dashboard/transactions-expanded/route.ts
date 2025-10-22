import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

const DashboardTransactionsQuerySchema = z.object({
  year: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(2000).max(2100)).optional().nullable(),
  month: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(12)).optional().nullable(),
  walletId: z.string().optional().nullable(),
});

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn('Unauthorized access attempt to /api/dashboard/transactions-expanded');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryParams = {
    year: searchParams.get('year'),
    month: searchParams.get('month'),
    walletId: searchParams.get('walletId'),
  };

  const validationResult = DashboardTransactionsQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError(
      'Validation failed in /api/dashboard/transactions-expanded',
      validationResult.error.flatten().fieldErrors,
      { email: session.user.email }
    );
    return NextResponse.json(
      { error: 'Invalid parameters', details: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { year, month, walletId } = validationResult.data;

  if (!year || !month) {
    return NextResponse.json(
      { error: 'Parameters year and month are required' },
      { status: 400 }
    );
  }

  try {
    // Calcular período
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Se for o mês atual, ajustar o endDate para hoje
    const today = new Date();
    if (
      year === today.getFullYear() &&
      month === today.getMonth() + 1
    ) {
      endDate.setUTCHours(today.getHours(), today.getMinutes(), today.getSeconds(), today.getMilliseconds());
      const endOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
      endDate.setTime(endOfToday.getTime());
    }

    // Fazer chamada para o endpoint de transações expandidas
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const expandedParams = new URLSearchParams({
      type: 'expense',
      from: formatDate(startDate),
      to: formatDate(endDate),
      limit: '500',
      sort: 'date_desc',
    });

    if (walletId) {
      expandedParams.append('walletId', walletId);
    }

    // Buscar expenses
    const expensesRes = await fetch(
      `${baseUrl}/api/transactions/expanded?${expandedParams.toString()}`,
      {
        headers: {
          'Cookie': req.headers.get('cookie') || '',
        },
      }
    );

    if (!expensesRes.ok) {
      throw new Error(`Failed to fetch expenses: ${expensesRes.statusText}`);
    }

    const expensesData = await expensesRes.json();

    // Buscar incomes
    const incomesParams = new URLSearchParams({
      type: 'income',
      from: formatDate(startDate),
      to: formatDate(endDate),
      limit: '500',
      sort: 'date_desc',
    });

    if (walletId) {
      incomesParams.append('walletId', walletId);
    }

    const incomesRes = await fetch(
      `${baseUrl}/api/transactions/expanded?${incomesParams.toString()}`,
      {
        headers: {
          'Cookie': req.headers.get('cookie') || '',
        },
      }
    );

    if (!incomesRes.ok) {
      throw new Error(`Failed to fetch incomes: ${incomesRes.statusText}`);
    }

    const incomesData = await incomesRes.json();

    logger.apiRequest('GET', '/api/dashboard/transactions-expanded', session.user.email, {
      year,
      month,
      walletId,
      expensesCount: expensesData.data.length,
      incomesCount: incomesData.data.length,
    });

    return NextResponse.json({
      expenses: expensesData.data,
      incomes: incomesData.data,
      period: {
        year,
        month,
        from: formatDate(startDate),
        to: formatDate(endDate),
      },
    });
  } catch (error) {
    logger.error('Error in /api/dashboard/transactions-expanded', error, { email: session.user.email });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
