// Simple debug script to test expandFixedOccurrences logic copied from route.ts

function expandFixedOccurrences(rows, startDate, endDate) {
  const occurrences = [];
  const sDate = startDate ? new Date(startDate) : null;
  const eDate = endDate ? new Date(endDate) : null;
  for (const r of rows) {
    if (!r.isRecurring) {
      occurrences.push({ ...r, kind: r.kind || 'unknown' });
      continue;
    }
    const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
    const seriesEnd = r.endDate ? new Date(r.endDate) : null;
    const from = sDate && sDate > seriesStart ? sDate : seriesStart;
    const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
    if (!to) {
      occurrences.push({ ...r, kind: r.kind || 'unknown', date: from });
      continue;
    }
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
    let months = 0;
    while (cursor <= endCursor && months < 24) {
      const day = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Math.min(Number(r.dayOfMonth), 28) : new Date(r.date).getDate();
      const occDate = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0);
      if ((!sDate || occDate >= sDate) && (!eDate || occDate <= eDate)) {
        occurrences.push({ ...r, kind: r.kind || 'unknown', date: occDate });
      }
      cursor.setMonth(cursor.getMonth() + 1);
      months += 1;
    }
  }
  return occurrences;
}

const sampleRows = [
  {
    id: '1',
    description: 'Salário',
    amount: 5000,
    date: '2025-01-15',
    isRecurring: true,
    startDate: '2025-01-01',
    endDate: null,
    dayOfMonth: 15,
    kind: 'income'
  },
  {
    id: '2',
    description: 'Assinatura',
    amount: 29.9,
    date: '2025-02-28',
    isRecurring: true,
    startDate: '2025-02-01',
    endDate: '2026-02-01',
    dayOfMonth: 31,
    kind: 'expense'
  },
  {
    id: '3',
    description: 'Compra pontual',
    amount: 100,
    date: '2025-09-10',
    isRecurring: false,
    kind: 'expense'
  }
];

const startDate = '2025-09-01';
const endDate = '2025-09-16';

const occ = expandFixedOccurrences(sampleRows, startDate, endDate);
console.log('Occurrences for', startDate, '->', endDate);
for (const o of occ) {
  const d = o.date ? (o.date instanceof Date ? o.date.toISOString().slice(0,10) : new Date(o.date).toISOString().slice(0,10)) : 'N/A';
  console.log(o.kind, o.description, '->', d);
}

console.log('Total occurrences:', occ.length);
