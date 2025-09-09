import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

function parseCsvParam(v: string | null | undefined) {
  if (!v) return undefined;
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const walletId = parseCsvParam(searchParams.get('walletId'));
  const year = Number(searchParams.get('year')) || undefined;
  const month = Number(searchParams.get('month')) || undefined;

  const walletFilter: any = {};
  if (walletId) {
    if (Array.isArray(walletId)) walletFilter.walletId = { in: walletId };
    else walletFilter.walletId = walletId;
  }

  if (!year || !month) return NextResponse.json({ error: 'year and month required' }, { status: 400 });

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const effectiveEnd = isCurrentMonth ? new Date(year, month - 1, today.getDate()) : end;

  const startDateObj = start;
  const endDateObj = effectiveEnd;

  // Fetch all expenses for period (both VARIABLE and FIXED expanded in existing APIs)
  const [expVar, expFix] = await Promise.all([
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'VARIABLE', ...walletFilter, date: { gte: startDateObj, lte: endDateObj } }, include: { category: true, wallet: true } }),
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'FIXED', ...walletFilter, date: { gte: startDateObj, lte: endDateObj } }, include: { category: true, wallet: true } }),
  ]);
  const allExpenses = [...expVar, ...expFix];

  // dailyByCategory
  const days: string[] = [];
  for (let d = 1; d <= effectiveEnd.getDate(); d++) days.push(toYmd(new Date(year, month - 1, d)));

  const categories = Array.from(new Set(allExpenses.map((e) => e.category?.name || 'Sem categoria')));
  const dailyByCategory = days.map((date) => {
    const row: Record<string, any> = { date };
    for (const c of categories) row[c] = 0;
    for (const e of allExpenses.filter((x) => x.date && toYmd(new Date(x.date)) === date)) {
      const key = e.category?.name || 'Sem categoria';
      row[key] += Number(e.amount || 0);
    }
    return row;
  });

  // dailyByWallet
  const wallets = Array.from(new Set(allExpenses.map((e) => e.wallet?.name || 'Sem carteira')));
  const dailyByWallet = days.map((date) => {
    const row: Record<string, any> = { date };
    for (const w of wallets) row[w] = 0;
    for (const e of allExpenses.filter((x) => x.date && toYmd(new Date(x.date)) === date)) {
      const key = e.wallet?.name || 'Sem carteira';
      row[key] += Number(e.amount || 0);
    }
    return row;
  });

  // dailyByTag
  const tags = Array.from(new Set(allExpenses.flatMap((e) => (Array.isArray(e.tags) ? e.tags : [])))).filter(Boolean);
  const dailyByTag = days.map((date) => {
    const row: Record<string, any> = { date };
    for (const t of tags) row[t] = 0;
    for (const e of allExpenses.filter((x) => x.date && toYmd(new Date(x.date)) === date)) {
      if (Array.isArray(e.tags)) {
        for (const t of e.tags) {
          if (!t) continue;
          row[t] = (row[t] || 0) + Number(e.amount || 0);
        }
      }
    }
    return row;
  });

  // monthlyData last 12 months
  const months: { month: string; expense: number; income: number; balance: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const mStartDate = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEndDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const [mExpVar, mExpFix, mIncVar, mIncFix] = await Promise.all([
      prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'VARIABLE', ...walletFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
      prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'FIXED', ...walletFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
      prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'VARIABLE', ...walletFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
      prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'FIXED', ...walletFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
    ]);
    const allExp = [...mExpVar, ...mExpFix];
    const allInc = [...mIncVar, ...mIncFix];
    const expense = allExp.reduce((s, x) => s + Number(x.amount || 0), 0);
    const income = allInc.reduce((s, x) => s + Number(x.amount || 0), 0);
    months.push({ month: `${d.toLocaleString('pt-BR', { month: 'short' })}/${d.getFullYear().toString().slice(-2)}`, expense, income, balance: income - expense });
  }

  // topExpenseCategories for current month vs previous
  const allExpensesThisMonth = allExpenses;
  const expenseMap = new Map<string, { amount: number; color: string }>();
  for (const e of allExpensesThisMonth) {
    const key = e.category?.name || 'Sem categoria';
    // fallback consistente com frontend: despesas usam muted-foreground quando não há cor
    const color = e.category?.color || 'hsl(var(--muted-foreground))';
    const cur = expenseMap.get(key) || { amount: 0, color };
    cur.amount += Number(e.amount || 0);
    // se categoria tiver cor explícita, preferir ela
    if (e.category?.color) cur.color = e.category.color;
    expenseMap.set(key, cur);
  }
  const expensesByCategory = Array.from(expenseMap.entries()).map(([category, v]) => ({ category, amount: v.amount, color: v.color }));

  // incomesByCategory for the current month
  const [incVarThis, incFixThis] = await Promise.all([
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'VARIABLE', ...walletFilter, date: { gte: startDateObj, lte: endDateObj } }, include: { category: true } }),
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'FIXED', ...walletFilter, date: { gte: startDateObj, lte: endDateObj } }, include: { category: true } }),
  ]);
  const allIncomesThisMonth = [...incVarThis, ...incFixThis];
  const incomeMap = new Map<string, { amount: number; color: string }>();
  for (const i of allIncomesThisMonth) {
    const key = i.category?.name || 'Sem categoria';
    // fallback consistente: rendas usam --success quando não há cor
    const color = i.category?.color || 'hsl(var(--success))';
    const cur = incomeMap.get(key) || { amount: 0, color };
    cur.amount += Number(i.amount || 0);
    if (i.category?.color) cur.color = i.category.color;
    incomeMap.set(key, cur);
  }
  const incomesByCategory = Array.from(incomeMap.entries()).map(([category, v]) => ({ category, amount: v.amount, color: v.color }));

  // Prev month amounts
  const prevMonth = new Date(year, month - 2, 1);
  const prevStartDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
  const prevMonthEndDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
  const [pExpVar, pExpFix] = await Promise.all([
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'VARIABLE', ...walletFilter, date: { gte: prevStartDate, lte: prevMonthEndDate } }, select: { amount: true, category: true } }),
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'FIXED', ...walletFilter, date: { gte: prevStartDate, lte: prevMonthEndDate } }, select: { amount: true, category: true } }),
  ]);
  const prevAll = [...pExpVar, ...pExpFix];
  const prevMap = new Map<string, number>();
  for (const e of prevAll) {
    const key = e.category?.name || 'Sem categoria';
    prevMap.set(key, (prevMap.get(key) || 0) + Number(e.amount || 0));
  }
  const categoriesWithDiff = expensesByCategory.map((c) => ({ category: c.category, amount: c.amount, prevAmount: prevMap.get(c.category) || 0, diff: c.amount - (prevMap.get(c.category) || 0) }));
  const expenseDiffAll = categoriesWithDiff.filter((c) => c.diff !== 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const topExpenseCategories = expenseDiffAll.slice(0, 5);

  // dailyBalanceData and balanceProjectionData simplified: compute cumulative balance across days
  // Need previous balance until day before start
  const prevEndDate = new Date(start.getFullYear(), start.getMonth(), 0);
  const [prevExpAll, prevIncAll] = await Promise.all([
  prisma.expense.findMany({ where: { user: { email: session.user.email }, ...walletFilter, date: { gte: new Date('1900-01-01'), lte: prevEndDate } }, select: { amount: true } }),
  prisma.income.findMany({ where: { user: { email: session.user.email }, ...walletFilter, date: { gte: new Date('1900-01-01'), lte: prevEndDate } }, select: { amount: true } }),
  ]);
  const previousBalance = prevIncAll.reduce((s: number, x: { amount?: number | null }) => s + Number(x.amount || 0), 0) - prevExpAll.reduce((s: number, x: { amount?: number | null }) => s + Number(x.amount || 0), 0);

  const dayMap: Record<string, { income: number; expense: number }> = {};
  for (const d of days) dayMap[d] = { income: 0, expense: 0 };
  // fill dayMap from incomes and expenses
  const incomes = await prisma.income.findMany({ where: { user: { email: session.user.email }, ...walletFilter, date: { gte: startDateObj, lte: endDateObj } }, select: { amount: true, date: true } });
  for (const i of incomes) {
    if (!i.date) continue;
    const key = toYmd(new Date(i.date));
    if (!dayMap[key]) continue;
    dayMap[key].income += Number(i.amount || 0);
  }
  for (const e of allExpenses) {
    if (!e.date) continue;
    const key = toYmd(new Date(e.date));
    if (!dayMap[key]) continue;
    dayMap[key].expense += Number(e.amount || 0);
  }
  const dayKeysSorted = Object.keys(dayMap).sort();
  let running = previousBalance;
  const dailyBalanceData: Array<{ date: string; balance: number }> = [];
  for (const k of dayKeysSorted) {
    running += dayMap[k].income - dayMap[k].expense;
    dailyBalanceData.push({ date: k, balance: running });
  }

  // balanceProjectionData: simple linear projection
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const daysElapsed = dayKeysSorted.length;
  const currentNet = running - previousBalance;
  const avgPerDay = daysElapsed > 0 ? currentNet / daysElapsed : 0;
  const historicalAvgPerDay = avgPerDay; // simplified for now
  const combinedAvgPerDay = avgPerDay; // simplified
  const projectedFinal = previousBalance + combinedAvgPerDay * totalDaysInMonth;
  const balanceProjectionData: Array<{ day: number; real?: number; baselineLinear?: number; baselineRecent?: number }> = [];
  const lastRealDay = isCurrentMonth ? Math.min(new Date().getDate(), totalDaysInMonth) : totalDaysInMonth;
  const lastRealBalance = dailyBalanceData.length ? dailyBalanceData[dailyBalanceData.length - 1].balance : previousBalance;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const realEntry = dailyBalanceData.find((x) => Number(x.date.split('-').pop()) === d);
    const real = realEntry && d <= lastRealDay ? realEntry.balance : undefined;
    let baselineLinear: number | undefined;
    let baselineRecent: number | undefined;
    if (!isCurrentMonth) {
      baselineLinear = undefined;
      baselineRecent = undefined;
    } else if (d <= lastRealDay) {
      baselineLinear = real !== undefined ? real : lastRealBalance;
      baselineRecent = real !== undefined ? real : lastRealBalance;
    } else {
      baselineLinear = lastRealBalance + combinedAvgPerDay * (d - lastRealDay);
      baselineRecent = lastRealBalance + combinedAvgPerDay * (d - lastRealDay);
    }
    balanceProjectionData.push({ day: d, real, baselineLinear, baselineRecent });
  }

  // Garantir chaves sempre presentes (mesmo que arrays vazias)
  const safeSummary = {
    monthlyData: Array.isArray(months) ? months : [],
    expensesByCategory: Array.isArray(expensesByCategory) ? expensesByCategory : [],
    incomesByCategory: Array.isArray(incomesByCategory) ? incomesByCategory : [],
    topExpenseCategories: Array.isArray(topExpenseCategories) ? topExpenseCategories : [],
    expenseDiffAll: Array.isArray(expenseDiffAll) ? expenseDiffAll : [],
    dailyBalanceData: Array.isArray(dailyBalanceData) ? dailyBalanceData : [],
    balanceProjectionData: Array.isArray(balanceProjectionData) ? balanceProjectionData : [],
  };

  const payload = {
    summary: safeSummary,
    dailyByCategory: Array.isArray(dailyByCategory) ? dailyByCategory : [],
    dailyByWallet: Array.isArray(dailyByWallet) ? dailyByWallet : [],
    dailyByTag: Array.isArray(dailyByTag) ? dailyByTag : [],
    monthlyData: Array.isArray(months) ? months : [],
    topExpenseCategories: Array.isArray(topExpenseCategories) ? topExpenseCategories : [],
  };

  return NextResponse.json(payload);
}
