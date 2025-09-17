import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ExcelJS from 'exceljs';

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
  const categoryIds = qp.get('categoryIds') ? qp.get('categoryIds')!.split(',').filter(Boolean) : undefined;
  const walletIds = qp.get('walletIds') ? qp.get('walletIds')!.split(',').filter(Boolean) : undefined;
  const tags = qp.get('tags') ? qp.get('tags')!.split(',').filter(Boolean) : undefined;

  // Normalize date-only query params to UTC day boundaries to avoid
  // off-by-one timezone issues (inclusive interval)
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

  const dateFilter: any = {};
  if (parsedStartDate) dateFilter.gte = parsedStartDate;
  if (parsedEndDate) dateFilter.lte = parsedEndDate;

  const commonWhere: any = {
    AND: [
      { userId: user.id },
      startDate || endDate ? { date: dateFilter } : {},
      categoryIds ? { categoryId: { in: categoryIds } } : {},
      walletIds ? { walletId: { in: walletIds } } : {},
      tags ? { tags: { hasSome: tags } } : {},
    ],
  };

  // fetch data (we will expand fixed occurrences similar to /api/reports)
  // resolve incoming tag filters (ids or names) to canonical tag names
  let tagNames: string[] = [];
  if (tags && tags.length > 0) {
    const tagRows: { id: string; name: string }[] = await prisma.tag.findMany({ where: { userId: user.id, OR: [ { id: { in: tags } }, { name: { in: tags } } ] } });
    tagNames = tagRows.map(t => t.name);
    if (tagNames.length === 0) tagNames = tags;
  }

  const incomesRaw = type === 'expense' ? [] : await prisma.income.findMany({ where: { AND: [ { userId: user.id }, categoryIds ? { categoryId: { in: categoryIds } } : {}, walletIds ? { walletId: { in: walletIds } } : {}, tagNames.length ? { tags: { hasSome: tagNames } } : {} ] }, include: { category: true, wallet: true } });
  const expensesRaw = type === 'income' ? [] : await prisma.expense.findMany({ where: { AND: [ { userId: user.id }, categoryIds ? { categoryId: { in: categoryIds } } : {}, walletIds ? { walletId: { in: walletIds } } : {}, tagNames.length ? { tags: { hasSome: tagNames } } : {} ] }, include: { category: true, wallet: true } });

  // helper to expand fixed occurrences (copied/adapted)
  const expandFixedOccurrencesLocal = async (rows: any[], kind: 'income' | 'expense') => {
    const occurrences: any[] = [];
    const sDate = parsedStartDate;
    const eDate = parsedEndDate;
    const getLastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    for (const r of rows) {
        if (!r.isFixed) {
        // for non-fixed records, include only if within requested date interval (if provided)
        const rowDate = r.date ? new Date(r.date) : null;
        if (rowDate) {
          if ((sDate && rowDate.getTime() < sDate.getTime()) || (eDate && rowDate.getTime() > eDate.getTime())) {
            continue; // out of requested interval
          }
        }
        occurrences.push({ ...r, kind });
        continue;
      }
      const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
      const seriesEnd = r.endDate ? new Date(r.endDate) : null;
      const from = sDate && sDate > seriesStart ? sDate : seriesStart;
      const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
      if (!to) {
        occurrences.push({ ...r, kind, date: from });
        continue;
      }
      let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
      let months = 0;
      while (cursor <= endCursor && months < 24) {
  const originalDay = r.date ? new Date(r.date).getUTCDate() : 1;
        let desiredDay = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Number(r.dayOfMonth) : originalDay;
        const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
        const day = Math.min(desiredDay, lastDay);
        const occDate = new Date(Date.UTC(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0));
        if ((!sDate || occDate.getTime() >= sDate.getTime()) && (!eDate || occDate.getTime() <= eDate.getTime())) {
          const occId = `${r.id}::${occDate.getUTCFullYear()}-${String(occDate.getUTCMonth()+1).padStart(2,'0')}-${String(occDate.getUTCDate()).padStart(2,'0')}`;
          occurrences.push({ ...r, kind, date: occDate, occurrenceId: occId });
        }
        cursor.setMonth(cursor.getMonth() + 1);
        months += 1;
      }
    }
    // normalize tag names
    const allTagValues = Array.from(new Set(occurrences.flatMap((o) => Array.isArray(o.tags) ? o.tags : [])));
    if (allTagValues.length > 0) {
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

  const results = [ ...(await expandFixedOccurrencesLocal(incomesRaw, 'income')), ...(await expandFixedOccurrencesLocal(expensesRaw, 'expense')) ].sort((a:any,b:any)=> new Date(b.date).getTime() - new Date(a.date).getTime());

  // totals: compute same way as /api/reports
  // - variable (non-fixed) records via DB aggregate with date filter
  // - fixed records by summing expanded occurrences
  const variableIncomeWhere: any = {
    AND: [
      { userId: user.id },
      { isFixed: false },
      startDate || endDate ? { date: dateFilter } : {},
      categoryIds ? { categoryId: { in: categoryIds } } : {},
      walletIds ? { walletId: { in: walletIds } } : {},
      tagNames && tagNames.length ? { tags: { hasSome: tagNames } } : {},
    ],
  };
  const variableExpenseWhere: any = {
    AND: [
      { userId: user.id },
      { isFixed: false },
      startDate || endDate ? { date: dateFilter } : {},
      categoryIds ? { categoryId: { in: categoryIds } } : {},
      walletIds ? { walletId: { in: walletIds } } : {},
      tagNames && tagNames.length ? { tags: { hasSome: tagNames } } : {},
    ],
  };

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.income.aggregate({ where: variableIncomeWhere, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: variableExpenseWhere, _sum: { amount: true } }),
  ]);

  const variableIncomeSum = Number(incomeAgg._sum.amount ?? 0);
  const variableExpenseSum = Number(expenseAgg._sum.amount ?? 0);

  // compute fixed sums by reproducing expansion logic (limited months etc.)
  const computeFixedSum = (rows: any[]) => {
    let sum = 0;
    const sDate = parsedStartDate;
    const eDate = parsedEndDate;
    const getLastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    for (const r of rows) {
      if (!r.isFixed) continue;
      const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
      const seriesEnd = r.endDate ? new Date(r.endDate) : null;
      const from = sDate && sDate > seriesStart ? sDate : seriesStart;
      const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
      if (!to) {
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

  const fixedIncomeSum = computeFixedSum(incomesRaw.filter((i: any) => i.isFixed));
  const fixedExpenseSum = computeFixedSum(expensesRaw.filter((e: any) => e.isFixed));

  const totalIncomes = variableIncomeSum + fixedIncomeSum;
  const totalExpenses = variableExpenseSum + fixedExpenseSum;

  // Criar workbook em memória (permite aplicar estilos/numFmt corretamente)
  const wb = new ExcelJS.Workbook();

  // Planilha de detalhes (em português)
  const wsDetails = wb.addWorksheet('Detalhes');
  wsDetails.columns = [
    { header: 'Data', key: 'date', width: 14 },
    { header: 'Tipo', key: 'type', width: 12 },
    { header: 'Descrição', key: 'description', width: 40 },
    { header: 'Categoria', key: 'category', width: 20 },
    { header: 'Carteira', key: 'wallet', width: 20 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Fixa', key: 'fixed', width: 8 },
    { header: 'Valor', key: 'amount', width: 14 },
  ];

  // cabeçalho (já definido via columns) — estilizar primeira linha
  const headerRow = wsDetails.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true } as any;
    cell.alignment = { vertical: 'middle', horizontal: 'center' } as any;
  });

  // ordenar resultados por data asc para export
  results.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // adicionar linhas de dados
  for (const r of results) {
    wsDetails.addRow({
      date: r.date ? new Date(r.date) : null,
      type: r.kind === 'income' ? 'Renda' : 'Despesa',
      description: r.description,
      category: r.category?.name ?? null,
      wallet: r.wallet?.name ?? null,
      tags: Array.isArray(r.tags) ? r.tags.join(', ') : null,
      fixed: r.isFixed ? 'Sim' : 'Não',
      // write expenses as negative values so spreadsheet shows them as debits
      amount: r.kind === 'expense' ? -Math.abs(Number(r.amount ?? 0)) : Number(r.amount ?? 0),
    } as any);
  }

  // aplicar formatos: data e contábil (accounting) em reais
  try {
    wsDetails.getColumn('date').numFmt = 'dd/mm/yyyy';
    wsDetails.getColumn('amount').numFmt = '_-* "R$"#,##0.00_-';
  } catch (e) {
    // ignore
  }

  // Planilha de resumo (em português)
  const wsAgg = wb.addWorksheet('Resumo');
  wsAgg.columns = [{ header: 'Métrica', key: 'metric', width: 30 }, { header: 'Valor', key: 'value', width: 20 }];
  // adicionar linhas de resumo (despesas como valor negativo)
  wsAgg.addRow(['Total Rendas', totalIncomes]);
  wsAgg.addRow(['Total Despesas', -Math.abs(totalExpenses)]);
  wsAgg.addRow(['Saldo', totalIncomes - Math.abs(totalExpenses)]);
  // estilizar cabeçalho (linha 1)
  const aggHeader = wsAgg.getRow(1);
  aggHeader.eachCell((cell) => { cell.font = { bold: true } as any; cell.alignment = { vertical: 'middle', horizontal: 'center' } as any; });
  // aplicar formato contábil na coluna de valores
  try {
    wsAgg.getColumn('value').numFmt = '_-* "R$"#,##0.00_-';
  } catch (e) {
    // ignore
  }

  // gerar buffer em memória
  const buffer = await wb.xlsx.writeBuffer();

  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', `attachment; filename="relatorio-${new Date().toISOString().slice(0,10)}.xlsx"`);

  return new NextResponse(Buffer.from(buffer), { headers });
}
