import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Rota: /api/reports
// Query params suportados:
// - type: 'income' | 'expense' | 'both' (default: both)
// - startDate, endDate: ISO strings
// - categoryIds: csv of category ids
// - walletIds: csv of wallet ids
// - tag: single tag name (prisma stores tags as string[])

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const qp = url.searchParams;

  const type = qp.get('type') || 'both';
  const startDate = qp.get('startDate');
  const endDate = qp.get('endDate');
  const categoryIds = qp.get('categoryIds') ? qp.get('categoryIds')!.split(',').filter(Boolean).map(id => id.trim()) : undefined;
  const walletIds = qp.get('walletIds') ? qp.get('walletIds')!.split(',').filter(Boolean).map(id => id.trim()) : undefined;
  const creditCardIds = qp.get('creditCardIds') ? qp.get('creditCardIds')!.split(',').filter(Boolean).map(id => id.trim()) : undefined;
  
  // Sanitize tags input to prevent injection attacks
  const tags = qp.get('tags') 
    ? qp.get('tags')!
        .split(',')
        .filter(Boolean)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length <= 100) // Limit tag length
        .map(tag => tag.replace(/[^\w\s\-\_\.]/g, '')) // Remove special chars except alphanumeric, spaces, dashes, underscores, dots
    : undefined;
    
  const page = Number(qp.get('page') || '1');
  const pageSize = Math.min(500, Math.max(1, Number(qp.get('pageSize') || '50')));
  const debugFlag = qp.get('debug') === '1';

  // If tags filter provided, resolve values (might be ids or names) to canonical tag names for filtering
  // We'll produce `tagNames` which contains the names we should match against the array field in DB.
  let tagNames: string[] = [];
  if (tags && tags.length > 0) {
    const normalizedIncoming = tags.map((t) => String(t).toLowerCase().trim());
    // fetch all user's tags and filter in-memory for robust matching
    const userTags: { id: string; name: string }[] = await prisma.tag.findMany({ where: { userId: user.id } });
    const nameMap: Record<string, string> = {};
    for (const t of userTags) {
      nameMap[String(t.name).toLowerCase().trim()] = t.name;
      nameMap[String(t.id)] = t.name; // allow matching by id as well
    }
    const matched: string[] = [];
    for (const inc of normalizedIncoming) {
      if (nameMap[inc]) matched.push(nameMap[inc]);
    }
    tagNames = matched.length > 0 ? Array.from(new Set(matched)) : tags;
  }

  // Build a flexible tag filter: try matching by resolved names and also by raw provided values
  // to cope with rows that stored tags as ids or names.
  const buildTagFilter = (resolvedNames: string[] | undefined, rawValues: string[] | undefined) => {
    const clauses: any[] = [];
    const seen = new Set<string>();
    const pushUnique = (arr?: string[]) => {
      if (!arr) return;
      const filtered = arr.map((x) => String(x).trim()).filter(Boolean);
      const uniq = Array.from(new Set(filtered));
      if (uniq.length) {
        clauses.push({ tags: { hasSome: uniq } });
        for (const v of uniq) seen.add(String(v).toLowerCase());
      }
    };
    pushUnique(resolvedNames);
    pushUnique(rawValues);
    if (clauses.length === 0) return {};
    if (clauses.length === 1) return clauses[0];
    return { OR: clauses };
  };

  // Normalize incoming date-only strings to UTC day boundaries to avoid
  // off-by-one errors caused by timezone shifts. If the query param is
  // a plain date (YYYY-MM-DD) we create a UTC start/end for that day.
  const parseStartToUtc = (d?: string | null) => {
    if (!d) return null;
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
    const dt = new Date(d);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
  };
  const parseEndToUtc = (d?: string | null) => {
    if (!d) return null;
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999));
    const dt = new Date(d);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999));
  };

  const parsedStartDate = parseStartToUtc(startDate);
  const parsedEndDate = parseEndToUtc(endDate);

  // Basic where clause builder (use normalized UTC dates)
  const dateFilter: any = {};
  if (parsedStartDate) dateFilter.gte = parsedStartDate;
  if (parsedEndDate) dateFilter.lte = parsedEndDate;

  try {
    const results: Array<any> = [];
    // where common used for counts/aggregates
    const commonWhere: any = {
      AND: [
        { userId: user.id },
        startDate || endDate ? { date: dateFilter } : {},
        categoryIds ? { categoryId: { in: categoryIds } } : {},
        walletIds ? { walletId: { in: walletIds } } : {},
        creditCardIds ? { creditCardId: { in: creditCardIds } } : {},
        ...(tags ? [buildTagFilter(tagNames, tags)] : []),
      ],
    };

    // Helper to expand recurring records into occurrences within the interval
    const expandRecurringOccurrences = async (rows: any[], kind: 'income' | 'expense') => {
      const occurrences: any[] = [];
      const sDate = parsedStartDate;
      const eDate = parsedEndDate;
      for (const r of rows) {
        // For non-recurring records, only include if within requested date interval (if provided)
        if (!r.isRecurring) {
          const rowDate = r.date ? new Date(r.date) : null;
          if (rowDate) {
            if ((sDate && rowDate < sDate) || (eDate && rowDate > eDate)) {
              continue; // out of requested interval
            }
          }
          occurrences.push({ ...r, kind });
          continue;
        }
        // determine series start and end
        const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
        const seriesEnd = r.endDate ? new Date(r.endDate) : null;
        // NOVA REGRA: só inclui recorrente se endDate for nula ou >= início do mês consultado
        const monthRef = (sDate || seriesStart);
        if (seriesEnd && seriesEnd < new Date(monthRef.getFullYear(), monthRef.getMonth(), 1)) {
          continue;
        }
        // compute intersection of [seriesStart, seriesEnd?] with [sDate,eDate]
        const from = sDate && sDate > seriesStart ? sDate : seriesStart;
        const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
        if (!to) {
          // no upper bound, include one occurrence at 'from'
          occurrences.push({ ...r, kind, date: from });
          continue;
        }
        // create monthly occurrences between from and to (inclusive), limit months to 24
        let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
        const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
        let months = 0;
        const getLastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
        const today = new Date();
        while (cursor <= endCursor && months < 24) {
          // determine desired day: prefer explicit dayOfMonth, otherwise use original record day (use UTC to avoid timezone shifts)
          const originalDay = r.date ? new Date(r.date).getUTCDate() : 1;
          let desiredDay = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Number(r.dayOfMonth) : originalDay;
          const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
          const day = Math.min(desiredDay, lastDay);
          const occDate = new Date(Date.UTC(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0));
          // NOVA REGRA: se mês atual, só inclui recorrente até o dia atual
          const isCurrentMonth = today.getFullYear() === occDate.getUTCFullYear() && today.getMonth() === occDate.getUTCMonth();
          if (isCurrentMonth && occDate.getUTCDate() > today.getDate()) {
            cursor.setMonth(cursor.getMonth() + 1);
            months += 1;
            continue;
          }
          // only include if within sDate..eDate (both normalized to UTC boundaries)
          if ((!sDate || occDate.getTime() >= sDate.getTime()) && (!eDate || occDate.getTime() <= eDate.getTime())) {
            // give a deterministic occurrence id so frontend can key rows properly
            const occId = `${r.id}::${occDate.getUTCFullYear()}-${String(occDate.getUTCMonth()+1).padStart(2,'0')}-${String(occDate.getUTCDate()).padStart(2,'0')}`;
            occurrences.push({ ...r, kind, date: occDate, occurrenceId: occId });
          }
          cursor.setMonth(cursor.getMonth() + 1);
          months += 1;
        }
      }
      // Normalize tags: if tags look like IDs, try to resolve names
      const allTagValues = Array.from(new Set(occurrences.flatMap((o) => Array.isArray(o.tags) ? o.tags : [])));
      if (allTagValues.length > 0) {
        // fetch user's tags once
        const tagsInDb = await prisma.tag.findMany({ where: { userId: user.id, OR: [ { id: { in: allTagValues } }, { name: { in: allTagValues } } ] } });
        const idToName: Record<string,string> = {};
        for (const t of tagsInDb) idToName[String(t.id)] = t.name, idToName[String(t.name)] = t.name;
        for (const o of occurrences) {
          if (!Array.isArray(o.tags)) continue;
          o.tags = o.tags.map((tv: string) => idToName[String(tv)] ?? String(tv));
        }
      }
      return occurrences;
    };

  // keep fetched rows accessible for totals calculation
  let incomesFetched: any[] = [];
  let expensesFetched: any[] = [];

    if (type === 'income' || type === 'both') {
      // fetch both fixed and variable incomes matching filters (excluding date filter because we'll handle occurrences)
      const incomeWhereBase: any = { AND: [ { userId: user.id }, categoryIds ? { categoryId: { in: categoryIds } } : {}, walletIds ? { walletId: { in: walletIds } } : {} ] };
      const incomeWhere = { ...incomeWhereBase, ...(tags ? { AND: [ ...(incomeWhereBase.AND || []), buildTagFilter(tagNames, tags) ] } : {} ) };
      let incomes = await prisma.income.findMany({ where: incomeWhere, include: { category: true, wallet: true } });
      // If DB returned no incomes when tags provided, attempt an in-memory fallback that matches tag ids/names case-insensitively
      if (tags && tags.length > 0 && incomes.length === 0) {
        try {
          const incomesNoTag = await prisma.income.findMany({ where: incomeWhereBase, include: { category: true, wallet: true } });
          if (incomesNoTag.length > 0) {
            // build name/id map for user's tags
            const userTags = await prisma.tag.findMany({ where: { userId: user.id } });
            const nameMap: Record<string, string> = {};
            for (const t of userTags) {
              nameMap[String(t.name).toLowerCase().trim()] = t.name;
              nameMap[String(t.id)] = t.name;
            }
            const normalizedIncoming = tags.map((t) => String(t).toLowerCase().trim());
            const filtered = incomesNoTag.filter((r: any) => {
              const rowTags = Array.isArray(r.tags) ? (r.tags as string[]).map((tv: string) => (nameMap[String(tv).toLowerCase().trim()] ?? nameMap[String(tv)] ?? String(tv))).map((s: string) => String(s).toLowerCase().trim()) : [];
              return normalizedIncoming.some((nt) => rowTags.includes(nt));
            });
            if (filtered.length > 0) incomes = filtered;
          }
        } catch (e) {
          // fallback best-effort: ignore and continue with empty set
        }
      }
      incomesFetched = incomes;
      const incOcc = await expandRecurringOccurrences(incomes, 'income');
      results.push(...incOcc);
    }

    if (type === 'expense' || type === 'both') {
      const expenseWhereBase: any = { AND: [ { userId: user.id }, categoryIds ? { categoryId: { in: categoryIds } } : {}, walletIds ? { walletId: { in: walletIds } } : {} ] };
      const expenseWhere = { ...expenseWhereBase, ...(tags ? { AND: [ ...(expenseWhereBase.AND || []), buildTagFilter(tagNames, tags) ] } : {} ) };
      let expenses = await prisma.expense.findMany({ where: expenseWhere, include: { category: true, wallet: true } });
      if (tags && tags.length > 0 && expenses.length === 0) {
        try {
          const expensesNoTag = await prisma.expense.findMany({ where: expenseWhereBase, include: { category: true, wallet: true } });
          if (expensesNoTag.length > 0) {
            const userTags = await prisma.tag.findMany({ where: { userId: user.id } });
            const nameMap: Record<string, string> = {};
            for (const t of userTags) {
              nameMap[String(t.name).toLowerCase().trim()] = t.name;
              nameMap[String(t.id)] = t.name;
            }
            const normalizedIncoming = tags.map((t) => String(t).toLowerCase().trim());
            const filtered = expensesNoTag.filter((r: any) => {
              const rowTags = Array.isArray(r.tags) ? (r.tags as string[]).map((tv: string) => (nameMap[String(tv).toLowerCase().trim()] ?? nameMap[String(tv)] ?? String(tv))).map((s: string) => String(s).toLowerCase().trim()) : [];
              return normalizedIncoming.some((nt) => rowTags.includes(nt));
            });
            if (filtered.length > 0) expenses = filtered;
          }
        } catch (e) {
          // ignore fallback errors
        }
      }
      expensesFetched = expenses;
      const expOcc = await expandRecurringOccurrences(expenses, 'expense');
      results.push(...expOcc);
    }

  // ordenar resultados por date asc (padrão de exibição: mais antigo -> mais novo)
  results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // totals: compute sums that respect all filters (date, category, wallet, tags)
    // Approach:
    // - For punctual (non-recurring) records, use DB aggregate with date filter applied
    // - For recurring records, compute occurrences within the interval and sum their amounts
    const computeRecurringSum = (rows: any[]) => {
      let sum = 0;
  const sDate = parsedStartDate;
  const eDate = parsedEndDate;
      const getLastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
      for (const r of rows) {
        if (!r.isRecurring) continue;
        const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
        const seriesEnd = r.endDate ? new Date(r.endDate) : null;
        const from = sDate && sDate > seriesStart ? sDate : seriesStart;
        const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
        if (!to) {
          // no upper bound: include one occurrence at 'from' (same behavior as expansion)
          const occDate = from;
          if ((!sDate || occDate.getTime() >= sDate.getTime()) && (!eDate || occDate.getTime() <= eDate.getTime())) sum += Number(r.amount ?? 0);
          continue;
        }
        let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
        const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
  let months = 0;
  const originalDay = r.date ? new Date(r.date).getUTCDate() : 1;
        while (cursor <= endCursor && months < 24) {
          let desiredDay = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Number(r.dayOfMonth) : originalDay;
          const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
          const day = Math.min(desiredDay, lastDay);
          const occDate = new Date(Date.UTC(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0));
          if ((!sDate || occDate.getTime() >= sDate.getTime()) && (!eDate || occDate.getTime() <= eDate.getTime())) {
            sum += Number(r.amount ?? 0);
          }
          cursor.setMonth(cursor.getMonth() + 1);
          months += 1;
        }
      }
      return sum;
    };

    // helper used only for debug: build a breakdown of occurrences per recurring row
    const buildRecurringBreakdown = (rows: any[]) => {
  const sDate = parsedStartDate;
  const eDate = parsedEndDate;
      const getLastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
      const breakdown: any[] = [];
      for (const r of rows) {
        if (!r.isRecurring) continue;
        const occurrences: string[] = [];
        const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
        const seriesEnd = r.endDate ? new Date(r.endDate) : null;
        const from = sDate && sDate > seriesStart ? sDate : seriesStart;
        const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
        if (!to) {
          const occDate = from;
          if ((!sDate || occDate.getTime() >= sDate.getTime()) && (!eDate || occDate.getTime() <= eDate.getTime())) occurrences.push(occDate.toISOString());
        } else {
          let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
          const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
          let months = 0;
          const originalDay = r.date ? new Date(r.date).getDate() : 1;
          while (cursor <= endCursor && months < 24) {
            let desiredDay = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Number(r.dayOfMonth) : originalDay;
            const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
            const day = Math.min(desiredDay, lastDay);
            const occDate = new Date(Date.UTC(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0));
            if ((!sDate || occDate.getTime() >= sDate.getTime()) && (!eDate || occDate.getTime() <= eDate.getTime())) occurrences.push(occDate.toISOString());
            cursor.setMonth(cursor.getMonth() + 1);
            months += 1;
          }
        }
        breakdown.push({ id: r.id, amount: r.amount, occurrences });
      }
      return breakdown;
    };

    // punctual incomes/expenses aggregate (DB) — apply same category/wallet/tag filters plus date
    const punctualIncomeWhere: any = {
      AND: [
        { userId: user.id },
        { isRecurring: false },
        startDate || endDate ? { date: dateFilter } : {},
        categoryIds ? { categoryId: { in: categoryIds } } : {},
        walletIds ? { walletId: { in: walletIds } } : {},
        ...(tags ? [buildTagFilter(tagNames, tags)] : []),
      ],
    };
    const punctualExpenseWhere: any = {
      AND: [
        { userId: user.id },
        { isRecurring: false },
        startDate || endDate ? { date: dateFilter } : {},
        categoryIds ? { categoryId: { in: categoryIds } } : {},
        walletIds ? { walletId: { in: walletIds } } : {},
        ...(tags ? [buildTagFilter(tagNames, tags)] : []),
      ],
    };

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.income.aggregate({ where: punctualIncomeWhere, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: punctualExpenseWhere, _sum: { amount: true } }),
    ]);

    const punctualIncomeSum = Number(incomeAgg._sum.amount ?? 0);
    const punctualExpenseSum = Number(expenseAgg._sum.amount ?? 0);

    // recurring sums: compute from fetched rows (these were already filtered by category/wallet/tags when loaded)
  const recurringIncomeSum = computeRecurringSum(incomesFetched.filter((i: any) => i.isRecurring));
  const recurringExpenseSum = computeRecurringSum(expensesFetched.filter((e: any) => e.isRecurring));

    const totalIncomes = punctualIncomeSum + recurringIncomeSum;
    const totalExpenses = punctualExpenseSum + recurringExpenseSum;

    // fallback raw DB aggregates (kept for debugging / comparison)
    // const incomeAgg = await prisma.income.aggregate({ where: commonWhere, _sum: { amount: true } });
    // const expenseAgg = await prisma.expense.aggregate({ where: commonWhere, _sum: { amount: true } });
    // const rawTotalIncomes = Number(incomeAgg._sum.amount ?? 0);
    // const rawTotalExpenses = Number(expenseAgg._sum.amount ?? 0);

    // counts (for pagination reflect expanded occurrences)
  const totalCount = results.length;

    // paginar (slice)
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = results.slice(start, end);

    const totals: any = { incomes: Number(totalIncomes ?? 0), expenses: Number(totalExpenses ?? 0) };
    if (type === 'both') totals.net = totals.incomes - totals.expenses;

    // If debug requested (and running in non-production), include breakdown to help debugging
    if (debugFlag && process.env.NODE_ENV !== 'production') {
      const occurrenceCount = results.length;
      const incomeOccurrences = results.filter((r) => r.kind === 'income');
      const expenseOccurrences = results.filter((r) => r.kind === 'expense');
      // sample few recurring occurrences that contributed (if any)
      const recurringSamples = results.filter((r) => r.isRecurring).slice(0, 20).map((r) => ({ id: r.id, occurrenceId: r.occurrenceId ?? null, date: r.date, amount: r.amount }));
      const debugPayload = {
        punctualIncomeSum,
        punctualExpenseSum,
        recurringIncomeSum,
        recurringExpenseSum,
        totals,
        parsedStartDate: parsedStartDate ? parsedStartDate.toISOString() : null,
        parsedEndDate: parsedEndDate ? parsedEndDate.toISOString() : null,
        counts: { incomesFetched: incomesFetched.length, expensesFetched: expensesFetched.length, occurrenceCount, incomeOccurrences: incomeOccurrences.length, expenseOccurrences: expenseOccurrences.length },
        recurringSamples,
        // include small samples of fetched recurring records so we can see if recurring rows exist and their fields
        fetchedRecurring: {
          incomes: incomesFetched.filter((i: any) => i.isRecurring).slice(0, 50),
          expenses: expensesFetched.filter((e: any) => e.isRecurring).slice(0, 50),
        },
        recurringBreakdown: {
          incomes: buildRecurringBreakdown(incomesFetched),
          expenses: buildRecurringBreakdown(expensesFetched),
        },
        // sample of expanded occurrences (first 50) with canonical ISO dates
        occurrencesSample: results.slice(0, 50).map((r) => ({ id: r.id, occurrenceId: r.occurrenceId ?? null, date: r.date ? new Date(r.date).toISOString() : null, kind: r.kind, isRecurring: Boolean(r.isRecurring) })),
        // sample of raw fetched rows (first 20) for inspection of stored dates
        fetchedSamples: {
          incomes: incomesFetched.slice(0, 20).map((r) => ({ id: r.id, date: r.date ? new Date(r.date).toISOString() : null, startDate: r.startDate ? new Date(r.startDate).toISOString() : null, endDate: r.endDate ? new Date(r.endDate).toISOString() : null })),
          expenses: expensesFetched.slice(0, 20).map((r) => ({ id: r.id, date: r.date ? new Date(r.date).toISOString() : null, startDate: r.startDate ? new Date(r.startDate).toISOString() : null, endDate: r.endDate ? new Date(r.endDate).toISOString() : null })),
        },
      };
  // debug payload returned in response; avoid logging to console
      return NextResponse.json({ data: pageData, page, pageSize, totalCount, totals, debug: debugPayload });
    }

    return NextResponse.json({ data: pageData, page, pageSize, totalCount, totals });
  } catch (err) {
    console.error('reports error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
