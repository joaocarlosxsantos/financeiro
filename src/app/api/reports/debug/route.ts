import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Dev-only debug route to inspect reports expansion. NEVER enable in production.
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const url = new URL(req.url);
  const qp = url.searchParams;
  const type = qp.get('type') || 'both';
  const startDate = qp.get('startDate');
  const endDate = qp.get('endDate');
  const tags = qp.get('tags') ? qp.get('tags')!.split(',').filter(Boolean) : undefined;

  // simple loader: fetch incomes/expenses then expand using same logic as reports
  const getLastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const expand = (rows: any[]) => {
    const out: any[] = [];
    const sDate = startDate ? new Date(startDate) : null;
    const eDate = endDate ? new Date(endDate) : null;
    for (const r of rows) {
      if (!r.isFixed) {
        const rowDate = r.date ? new Date(r.date) : null;
        if (rowDate) {
          if ((sDate && rowDate < sDate) || (eDate && rowDate > eDate)) continue;
        }
        out.push({ ...r, kind: r.type === 'FIXED' ? 'income' : 'expense' });
        continue;
      }
      const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
      const seriesEnd = r.endDate ? new Date(r.endDate) : null;
      const from = sDate && sDate > seriesStart ? sDate : seriesStart;
      const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
      if (!to) { out.push({ ...r, date: from }); continue; }
      let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
      let months = 0;
      while (cursor <= endCursor && months < 24) {
        const originalDay = r.date ? new Date(r.date).getUTCDate() : 1;
        let desiredDay = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Number(r.dayOfMonth) : originalDay;
        const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
        const day = Math.min(desiredDay, lastDay);
        const occDate = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0);
        if ((!sDate || occDate >= sDate) && (!eDate || occDate <= eDate)) out.push({ ...r, date: occDate, occurrenceId: `${r.id}::${occDate.toISOString().slice(0,10)}` });
        cursor.setMonth(cursor.getMonth() + 1);
        months += 1;
      }
    }
    return out;
  };

  // Dev: fetch all incomes/expenses (no user-scoped where) to inspect expansion logic
  const incomes = await prisma.income.findMany({ include: { category: true, wallet: true } });
  const expenses = await prisma.expense.findMany({ include: { category: true, wallet: true } });
  const inc = expand(incomes);
  const exp = expand(expenses);
  return NextResponse.json({ incomesCount: incomes.length, expensesCount: expenses.length, incomeOccurrences: inc.slice(0,50), expenseOccurrences: exp.slice(0,50), incomeRawSample: incomes.slice(0,5), expenseRawSample: expenses.slice(0,5) });
}
