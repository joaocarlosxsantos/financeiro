import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

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

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

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
    const sDate = startDate ? new Date(startDate) : null;
    const eDate = endDate ? new Date(endDate) : null;
    const getLastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    for (const r of rows) {
      if (!r.isFixed) {
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
        const occDate = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0);
        if ((!sDate || occDate >= sDate) && (!eDate || occDate <= eDate)) {
          const occId = `${r.id}::${occDate.getFullYear()}-${String(occDate.getMonth()+1).padStart(2,'0')}-${String(occDate.getDate()).padStart(2,'0')}`;
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

  // totals
  const incomeAgg = await prisma.income.aggregate({ where: commonWhere, _sum: { amount: true } });
  const expenseAgg = await prisma.expense.aggregate({ where: commonWhere, _sum: { amount: true } });
  const totalIncomes = Number(incomeAgg._sum.amount ?? 0);
  const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

  // create a PassThrough stream to pipe the WorkbookWriter output directly to the response
  const passThrough = new PassThrough();

  // WorkbookWriter (streaming) uses less memory for large exports
  const wbWriter = new (ExcelJS.stream.xlsx.WorkbookWriter)({ stream: passThrough, useSharedStrings: true, useStyles: true });

  // Details worksheet
  const wsDetails = wbWriter.addWorksheet('Details');
  wsDetails.columns = [
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Wallet', key: 'wallet', width: 20 },
    { header: 'Amount', key: 'amount', width: 14 },
  ];

  // add header row with styles
  const headerVals = wsDetails.columns.map(c => c.header);
  const headerRow = wsDetails.addRow(headerVals as any);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true } as any;
    cell.alignment = { vertical: 'middle', horizontal: 'center' } as any;
  });
  headerRow.commit();

  // write detail rows streaming
  for (const r of results) {
    const row = wsDetails.addRow({
      date: r.date ? new Date(r.date) : undefined,
      type: r.kind,
      description: r.description,
      category: r.category?.name ?? null,
      wallet: r.wallet?.name ?? null,
      // join tags into a readable string
      tags: Array.isArray(r.tags) ? (r.tags.join(', ')) : null,
      amount: Number(r.amount),
    } as any);
    // ensure number/date cells use proper types
    // date formatting via numFmt on column
    row.commit();
  }

  // set date and amount formats on columns
  try {
    const dateCol = wsDetails.getColumn(1);
    dateCol.numFmt = 'dd/mm/yyyy';
    const amtCol = wsDetails.getColumn(6);
    amtCol.numFmt = '"R$"#,##0.00';
  } catch (e) {
    // ignore if streaming implementation does not support getColumn styles in this env
  }

  // Aggregates worksheet (streamed)
  const wsAgg = wbWriter.addWorksheet('Aggregates');
  wsAgg.columns = [ { header: 'Metric', key: 'metric', width: 30 }, { header: 'Value', key: 'value', width: 20 } ];
  const a1 = wsAgg.addRow(['Total Incomes', totalIncomes]); a1.commit();
  const a2 = wsAgg.addRow(['Total Expenses', totalExpenses]); a2.commit();
  const a3 = wsAgg.addRow(['Net', totalIncomes - totalExpenses]); a3.commit();
  wsAgg.commit();

  // finalize workbook: commit will flush to the provided stream
  wbWriter.commit().then(() => {
    // workbook finished writing; end the passThrough
    passThrough.end();
  }).catch((err) => {
    console.error('excel writer commit error', err);
    passThrough.destroy(err as any);
  });

  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', `attachment; filename="report-${new Date().toISOString()}.xlsx"`);

  return new NextResponse(passThrough as any, { headers });
}
