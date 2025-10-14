import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { formatYmd } from '../../../../lib/utils';
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
  const paymentType = parseCsvParam(searchParams.get('paymentType'));
  const year = Number(searchParams.get('year')) || undefined;
  const month = Number(searchParams.get('month')) || undefined;

  const walletFilter: any = {};
  if (walletId) {
    if (Array.isArray(walletId)) walletFilter.walletId = { in: walletId };
    else walletFilter.walletId = walletId;
  }

  const paymentTypeFilter: any = {};
  if (paymentType) {
    if (Array.isArray(paymentType)) paymentTypeFilter.paymentType = { in: paymentType };
    else paymentTypeFilter.paymentType = paymentType;
  }

  if (!year || !month) return NextResponse.json({ error: 'year and month required' }, { status: 400 });

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const effectiveEnd = isCurrentMonth ? new Date(year, month - 1, today.getDate()) : end;

  const startDateObj = start;
  const endDateObj = effectiveEnd;

  // Fetch all expenses for period (both PUNCTUAL and RECURRING expanded in existing APIs)
  // Buscar despesas PONTUAIS no período e todas as despesas RECORRENTES (para expandir ocorrências)
  const [expVar, expFix] = await Promise.all([
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: startDateObj, lte: endDateObj } }, include: { category: true, wallet: true } }),
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter }, include: { category: true, wallet: true } }),
  ]);
  // Expand RECURRING expenses into individual occurrences inside the requested period
  const expandedFixed: any[] = [];
  for (const e of expFix) {
    // determine recurrence window
    const recStart = e.startDate ?? e.date ?? startDateObj;
    const recEnd = e.endDate ?? endDateObj;
    const from = recStart > startDateObj ? recStart : startDateObj;
    const to = recEnd < endDateObj ? recEnd : endDateObj;
    if (!from || !to) continue;

    const day = typeof e.dayOfMonth === 'number' && e.dayOfMonth > 0 ? e.dayOfMonth : new Date(e.date).getDate();

    // iterate months between from and to
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur.getTime() <= last.getTime()) {
      const lastDayOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const dayInMonth = Math.min(day, lastDayOfMonth);
      const occDate = new Date(cur.getFullYear(), cur.getMonth(), dayInMonth);
      if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
        expandedFixed.push({ ...e, date: formatYmd(occDate) });
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  const allExpenses = [...expVar, ...expandedFixed];

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
      prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
      prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
      prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
      prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: mStartDate, lte: mEndDate } }, select: { amount: true } }),
    ]);
    const allExp = [...mExpVar, ...mExpFix];
    const allInc = [...mIncVar, ...mIncFix];
    const expense = allExp.reduce((s, x) => s + Number(x.amount || 0), 0);
    const income = allInc.reduce((s, x) => s + Number(x.amount || 0), 0);
    months.push({ month: `${d.toLocaleString('pt-BR', { month: 'short' })}/${d.getFullYear().toString().slice(-2)}`, expense, income, balance: income - expense });
  }

  // topExpenseCategories for current month vs previous
  // use the expanded list (which already contains occurrences for RECURRING) for current month totals
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
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: startDateObj, lte: endDateObj } }, include: { category: true } }),
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: startDateObj, lte: endDateObj } }, include: { category: true } }),
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
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: prevStartDate, lte: prevMonthEndDate } }, select: { amount: true, category: true } }),
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: prevStartDate, lte: prevMonthEndDate } }, select: { amount: true, category: true } }),
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
  // Need previous balance until day before start — include occurrences from RECURRING records
  const prevEndDate = new Date(start.getFullYear(), start.getMonth(), 0);
  // helper to count monthly occurrences of a recurring record between windowStart/windowEnd
  function countMonthlyOccurrences(recStart?: Date | null, recEnd?: Date | null, dayOfMonth?: number | null, windowStart?: Date, windowEnd?: Date) {
    if (!recStart) return 0;
    const start = recStart;
    const end = recEnd ?? windowEnd ?? new Date();
    const from = start > (windowStart ?? start) ? start : (windowStart ?? start);
    const to = end < (windowEnd ?? end) ? end : (windowEnd ?? end);
    if (from.getTime() > to.getTime()) return 0;
    // compute first candidate month
    let y1 = from.getFullYear();
    let m1 = from.getMonth();
    const lastDayFirst = new Date(y1, m1 + 1, 0).getDate();
    const occDayFirst = Math.min(dayOfMonth ?? from.getDate(), lastDayFirst);
    // if the occurrence in the first month is before 'from' date, start next month
    if (occDayFirst < from.getDate()) {
      m1++;
      if (m1 > 11) { m1 = 0; y1++; }
    }
    let y2 = to.getFullYear();
    let m2 = to.getMonth();
    const lastDayLast = new Date(y2, m2 + 1, 0).getDate();
    const occDayLast = Math.min(dayOfMonth ?? to.getDate(), lastDayLast);
    // if occurrence in last month is after 'to' date, move to previous month
    if (occDayLast > to.getDate()) {
      m2--;
      if (m2 < 0) { m2 = 11; y2--; }
    }
    const monthsBetween = (y2 - y1) * 12 + (m2 - m1);
    return monthsBetween >= 0 ? monthsBetween + 1 : 0;
  }

  // fetch punctual expenses/incomes up to prevEndDate and all RECURRING to count occurrences
  const [prevExpVar, prevExpFix, prevIncVar, prevIncFix] = await Promise.all([
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: new Date('1900-01-01'), lte: prevEndDate } }, select: { amount: true, date: true } }),
    prisma.expense.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter }, select: { amount: true, date: true, startDate: true, endDate: true, dayOfMonth: true } }),
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: new Date('1900-01-01'), lte: prevEndDate } }, select: { amount: true, date: true } }),
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter }, select: { amount: true, date: true, startDate: true, endDate: true, dayOfMonth: true } }),
  ]);

  const prevExpTotalVar = prevExpVar.reduce((s: number, x: { amount?: number | null }) => s + Number(x.amount || 0), 0);
  let prevExpTotalFixed = 0;
  for (const e of prevExpFix) {
    const recStart = e.startDate ?? e.date ?? null;
    const recEnd = e.endDate ?? null;
    const cnt = countMonthlyOccurrences(recStart, recEnd, (e as any).dayOfMonth ?? null, undefined, prevEndDate);
    prevExpTotalFixed += Number(e.amount || 0) * cnt;
  }
  const prevIncTotalVar = prevIncVar.reduce((s: number, x: { amount?: number | null }) => s + Number(x.amount || 0), 0);
  let prevIncTotalFixed = 0;
  for (const i of prevIncFix) {
    const recStart = i.startDate ?? i.date ?? null;
    const recEnd = i.endDate ?? null;
    const cnt = countMonthlyOccurrences(recStart, recEnd, (i as any).dayOfMonth ?? null, undefined, prevEndDate);
    prevIncTotalFixed += Number(i.amount || 0) * cnt;
  }
  const previousBalance = prevIncTotalVar + prevIncTotalFixed - (prevExpTotalVar + prevExpTotalFixed);

  const dayMap: Record<string, { income: number; expense: number }> = {};
  for (const d of days) dayMap[d] = { income: 0, expense: 0 };
  // fill dayMap from incomes and expenses
  // fetch incomes punctual in period and RECURRING incomes (to expand occurrences into this period)
  const [incVarList, incFixList] = await Promise.all([
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'PUNCTUAL', transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: startDateObj, lte: endDateObj } }, select: { amount: true, date: true } }),
    prisma.income.findMany({ where: { user: { email: session.user.email }, type: 'RECURRING', transferId: null, ...walletFilter, ...paymentTypeFilter }, select: { amount: true, date: true, startDate: true, endDate: true, dayOfMonth: true } }),
  ]);
  const expandedFixedIncomes: any[] = [];
  for (const inc of incFixList) {
    const recStart = inc.startDate ?? inc.date ?? startDateObj;
    const recEnd = inc.endDate ?? endDateObj;
    const from = recStart > startDateObj ? recStart : startDateObj;
    const to = recEnd < endDateObj ? recEnd : endDateObj;
    if (!from || !to) continue;
    const day = typeof (inc as any).dayOfMonth === 'number' && (inc as any).dayOfMonth > 0 ? (inc as any).dayOfMonth : new Date(inc.date).getDate();
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur.getTime() <= last.getTime()) {
      const lastDayOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const dayInMonth = Math.min(day, lastDayOfMonth);
      const occDate = new Date(cur.getFullYear(), cur.getMonth(), dayInMonth);
      if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
        expandedFixedIncomes.push({ ...inc, date: formatYmd(occDate) });
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  const incomesCombined = [...incVarList, ...expandedFixedIncomes];
  for (const i of incomesCombined) {
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

  // Projeção Linear Global: média diária líquida desde o primeiro dia do mês até hoje
  // baselineLinear(d) = previousBalance + avgPerDay * d

  // Projeção Ritmo Recente: média dos últimos 7 dias comparada com os mesmos 7 dias dos últimos 3 meses
  // Calcular net dos últimos 7 dias (baseado em dayMap)
  const lastRealDay = isCurrentMonth ? Math.min(new Date().getDate(), totalDaysInMonth) : totalDaysInMonth;
  const startRecentDay = Math.max(1, lastRealDay - 6);
  let netLast7 = 0;
  for (let dd = startRecentDay; dd <= lastRealDay; dd++) {
    const key = toYmd(new Date(year, month - 1, dd));
    const entry = dayMap[key];
    if (entry) netLast7 += (entry.income || 0) - (entry.expense || 0);
  }

  // buscar valores equivalentes nos últimos 3 meses
  const recentNets: number[] = [];
  if (netLast7 !== 0) recentNets.push(netLast7);

  for (let m = 1; m <= 3; m++) {
    const monthDate = new Date(year, month - 1 - m, 1);
    const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const startDay = startRecentDay;
    const endDay = Math.min(startDay + 6, lastDayOfMonth);
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), startDay);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), endDay);

    // soma variáveis nesse intervalo
    const [varsExp, varsInc] = await Promise.all([
      prisma.expense.findMany({ where: { user: { email: session.user.email }, transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: startDate, lte: endDate } }, select: { amount: true } }),
      prisma.income.findMany({ where: { user: { email: session.user.email }, transferId: null, ...walletFilter, ...paymentTypeFilter, date: { gte: startDate, lte: endDate } }, select: { amount: true } }),
    ]);
    const sumVarsExp = varsExp.reduce((s: number, x: { amount?: number | null }) => s + Number(x.amount || 0), 0);
    const sumVarsInc = varsInc.reduce((s: number, x: { amount?: number | null }) => s + Number(x.amount || 0), 0);

    // considerar RECURRING ocorrências: prevExpFix e prevIncFix contém registros RECURRING (com startDate/endDate/dayOfMonth)
    let sumFixedExp = 0;
    for (const fe of prevExpFix) {
      const recStart = fe.startDate ?? fe.date ?? null;
      const recEnd = fe.endDate ?? null;
      const cnt = countMonthlyOccurrences(recStart, recEnd, (fe as any).dayOfMonth ?? null, startDate, endDate);
      sumFixedExp += Number(fe.amount || 0) * cnt;
    }
    let sumFixedInc = 0;
    for (const fi of prevIncFix) {
      const recStart = fi.startDate ?? fi.date ?? null;
      const recEnd = fi.endDate ?? null;
      const cnt = countMonthlyOccurrences(recStart, recEnd, (fi as any).dayOfMonth ?? null, startDate, endDate);
      sumFixedInc += Number(fi.amount || 0) * cnt;
    }

    const net = sumVarsInc + sumFixedInc - (sumVarsExp + sumFixedExp);
    if (net !== 0) recentNets.push(net);
  }

  const validRecentCount = recentNets.length;
  const avgRecent7 = validRecentCount > 0 ? recentNets.reduce((s, v) => s + v, 0) / validRecentCount : 0;
  const perDayRecent = avgRecent7 / 7;

  const balanceProjectionData: Array<{ day: number; real?: number; baselineLinear?: number; baselineRecent?: number }> = [];
  const lastRealBalance = dailyBalanceData.length ? dailyBalanceData[dailyBalanceData.length - 1].balance : previousBalance;
  // projetar a partir do saldo real do último dia com dado (lastRealBalance)
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const realEntry = dailyBalanceData.find((x) => Number(x.date.split('-').pop()) === d);
    const real = realEntry && d <= lastRealDay ? realEntry.balance : undefined;

    let baselineLinear: number | undefined = undefined;
    let baselineRecent: number | undefined = undefined;
    // Somente projetar para o mês atual. Garantir que o dia atual (lastRealDay)
    // tenha baseline igual ao saldo real para conectar as linhas.
    if (isCurrentMonth && d >= lastRealDay) {
      const daysAfter = d - lastRealDay;
      baselineLinear = lastRealBalance + avgPerDay * daysAfter;
      baselineRecent = lastRealBalance + perDayRecent * daysAfter;
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
