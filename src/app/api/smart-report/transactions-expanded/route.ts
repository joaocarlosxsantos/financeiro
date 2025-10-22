import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

const SmartReportTransactionsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
  walletId: z.string().nullable().optional(),
  includeRecurring: z.string().nullable().optional().default('true'),
});

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseMonth(month: string): { year: number; monthNum: number } {
  const [year, monthNum] = month.split('-').map(Number);
  return { year, monthNum };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn('Unauthorized access attempt to /api/smart-report/transactions-expanded');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryParams = {
    month: searchParams.get('month'),
    walletId: searchParams.get('walletId'),
    includeRecurring: searchParams.get('includeRecurring'),
  };

  const validationResult = SmartReportTransactionsQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    logger.validationError(
      'Validation failed in /api/smart-report/transactions-expanded',
      validationResult.error.flatten().fieldErrors,
      { email: session.user.email }
    );
    return NextResponse.json(
      { error: 'Invalid parameters', details: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { month, walletId, includeRecurring } = validationResult.data;

  try {
    const { year, monthNum } = parseMonth(month);

    // Calcular período
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Buscar expenses expandidas
    const expensesParams = new URLSearchParams({
      type: 'expense',
      from: formatDate(startDate),
      to: formatDate(endDate),
      sort: 'date_desc',
      limit: '500',
    });

    if (walletId) {
      expensesParams.append('walletId', walletId);
    }

    const expensesRes = await fetch(
      `${baseUrl}/api/transactions/expanded?${expensesParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Cookie': req.headers.get('cookie') || '',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.email}`,
        },
      }
    );

    if (!expensesRes.ok) {
      throw new Error(`Failed to fetch expenses: ${expensesRes.statusText}`);
    }

    const expensesData = await expensesRes.json();
    
    logger.info(`Expenses data:`, {
      ok: expensesRes.ok,
      status: expensesRes.status,
      dataLength: expensesData.data?.length || 0,
      hasData: !!expensesData.data,
    });

    // Buscar incomes expandidas
    const incomesParams = new URLSearchParams({
      type: 'income',
      from: formatDate(startDate),
      to: formatDate(endDate),
      sort: 'date_desc',
      limit: '500',
    });

    if (walletId) {
      incomesParams.append('walletId', walletId);
    }

    const incomesRes = await fetch(
      `${baseUrl}/api/transactions/expanded?${incomesParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Cookie': req.headers.get('cookie') || '',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.email}`,
        },
      }
    );

    if (!incomesRes.ok) {
      throw new Error(`Failed to fetch incomes: ${incomesRes.statusText}`);
    }

    const incomesData = await incomesRes.json();
    
    logger.info(`Incomes data:`, {
      ok: incomesRes.ok,
      status: incomesRes.status,
      dataLength: incomesData.data?.length || 0,
      hasData: !!incomesData.data,
    });

    // Calcular métricas
    const expenses = expensesData.data || [];
    const incomes = incomesData.data || [];

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const totalIncomes = incomes.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    const balance = totalIncomes - totalExpenses;

    const expensesRecurring = expenses.filter((e: any) => e.isRecurringExpanded).length;
    const incomesRecurring = incomes.filter((i: any) => i.isRecurringExpanded).length;

    // Mês anterior para comparação
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const prevExpensesParams = new URLSearchParams({
      type: 'expense',
      from: formatDate(new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0))),
      to: formatDate(new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999))),
      limit: '500',
      sort: 'date_desc',
    });

    if (walletId) {
      prevExpensesParams.append('walletId', walletId);
    }

    const prevExpensesRes = await fetch(
      `${baseUrl}/api/transactions/expanded?${prevExpensesParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Cookie': req.headers.get('cookie') || '',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.email}`,
        },
      }
    );

    let prevTotalExpenses = 0;
    if (prevExpensesRes.ok) {
      const data = await prevExpensesRes.json();
      prevTotalExpenses = data.data.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    }

    const prevIncomesParams = new URLSearchParams({
      type: 'income',
      from: formatDate(new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0))),
      to: formatDate(new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999))),
      limit: '500',
      sort: 'date_desc',
    });

    if (walletId) {
      prevIncomesParams.append('walletId', walletId);
    }

    const prevIncomesRes = await fetch(
      `${baseUrl}/api/transactions/expanded?${prevIncomesParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Cookie': req.headers.get('cookie') || '',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.email}`,
        },
      }
    );

    let prevTotalIncomes = 0;
    if (prevIncomesRes.ok) {
      const data = await prevIncomesRes.json();
      prevTotalIncomes = data.data.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    }

    logger.apiRequest('GET', '/api/smart-report/transactions-expanded', session.user.email, {
      month,
      walletId,
      expensesCount: expenses.length,
      incomesCount: incomes.length,
      totalExpenses,
      totalIncomes,
      balance,
    });

    logger.info('Smart Report Response:', {
      totalExpenses,
      totalIncomes,
      balance,
      expensesCount: expenses.length,
      incomesCount: incomes.length,
    });

    return NextResponse.json({
      period: {
        month,
        year,
        monthNum,
        from: formatDate(startDate),
        to: formatDate(endDate),
      },
      current: {
        expenses,
        incomes,
        totalExpenses,
        totalIncomes,
        balance,
        expensesCount: expenses.length,
        incomesCount: incomes.length,
        recurringExpensesCount: expensesRecurring,
        recurringIncomesCount: incomesRecurring,
      },
      previous: {
        month: prevMonthStr,
        totalExpenses: prevTotalExpenses,
        totalIncomes: prevTotalIncomes,
        balance: prevTotalIncomes - prevTotalExpenses,
      },
      comparison: {
        expensesDiff: totalExpenses - prevTotalExpenses,
        incomesDiff: totalIncomes - prevTotalIncomes,
        balanceDiff: balance - (prevTotalIncomes - prevTotalExpenses),
      },
    });
  } catch (error) {
    logger.error('Error in /api/smart-report/transactions-expanded', error, { email: session.user.email });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
