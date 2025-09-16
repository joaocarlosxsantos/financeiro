// script to reproduce computeFixedSum/buildFixedBreakdown logic
const fixedRows = [
  {
    id: 'cmfbxk78w0001ih04yz6xsyza',
    description: 'Salário',
    amount: '5099.53',
    date: '2025-08-01T00:00:00.000Z',
    type: 'FIXED',
    isFixed: true,
    startDate: null,
    endDate: null,
    dayOfMonth: null,
  },
  {
    id: 'cmfbzkcdm0001l504lvfe70r5',
    description: 'Saldo Alelo Refeição',
    amount: '1000',
    date: '2025-08-01T00:00:00.000Z',
    type: 'FIXED',
    isFixed: true,
    startDate: null,
    endDate: null,
    dayOfMonth: null,
  }
];

const startDate = new Date('2025-09-01T00:00:00.000Z');
const endDate = new Date('2025-09-16T23:59:59.999Z');

function getLastDayOfMonth(y,m){return new Date(y,m+1,0).getDate();}

function computeFixedSum(rows){
  let sum = 0;
  const sDate = startDate || null;
  const eDate = endDate || null;
  for(const r of rows){
    if(!r.isFixed) continue;
    const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
    const seriesEnd = r.endDate ? new Date(r.endDate) : null;
    const from = sDate && sDate > seriesStart ? sDate : seriesStart;
    const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
    console.log(`\nrow ${r.id} seriesStart=${seriesStart.toISOString()} seriesEnd=${seriesEnd ? seriesEnd.toISOString() : 'null'} from=${from.toISOString()} to=${to ? to.toISOString() : 'null'}`);
    if(!to){
      const occDate = from;
      console.log(`  single-occurrence at ${occDate.toISOString()} compare sDate=${sDate ? sDate.toISOString() : 'null'} eDate=${eDate ? eDate.toISOString() : 'null'}`);
      if((!sDate || occDate >= sDate) && (!eDate || occDate <= eDate)) {
        console.log('   -> included');
        sum += Number(r.amount ?? 0);
      } else {
        console.log('   -> excluded');
      }
      continue;
    }
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
    let months = 0;
    const originalDay = r.date ? new Date(r.date).getDate() : 1;
    while(cursor <= endCursor && months < 24){
      let desiredDay = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Number(r.dayOfMonth) : originalDay;
      const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
      const day = Math.min(desiredDay, lastDay);
      const occDate = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0);
      console.log(`  cursor=${cursor.toISOString()} day=${day} occDate=${occDate.toISOString()} check: >=sDate?=${!sDate || occDate >= sDate} <=eDate?=${!eDate || occDate <= eDate}`);
      if((!sDate || occDate >= sDate) && (!eDate || occDate <= eDate)){
        console.log('   -> included');
        sum += Number(r.amount ?? 0);
      }
      cursor.setMonth(cursor.getMonth() + 1);
      months += 1;
    }
  }
  return sum;
}

function buildFixedBreakdown(rows){
  const breakdown = [];
  const sDate = startDate || null;
  const eDate = endDate || null;
  for(const r of rows){
    if(!r.isFixed) continue;
    const occurrences = [];
    const seriesStart = r.startDate ? new Date(r.startDate) : new Date(r.date);
    const seriesEnd = r.endDate ? new Date(r.endDate) : null;
    const from = sDate && sDate > seriesStart ? sDate : seriesStart;
    const to = eDate && seriesEnd ? (eDate < seriesEnd ? eDate : seriesEnd) : (eDate || seriesEnd || null);
    if(!to){
      const occDate = from;
      if((!sDate || occDate >= sDate) && (!eDate || occDate <= eDate)) occurrences.push(occDate.toISOString());
    } else {
      let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);
      let months = 0;
      const originalDay = r.date ? new Date(r.date).getDate() : 1;
      while(cursor <= endCursor && months < 24){
        let desiredDay = (r.dayOfMonth && Number.isFinite(r.dayOfMonth)) ? Number(r.dayOfMonth) : originalDay;
        const lastDay = getLastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
        const day = Math.min(desiredDay, lastDay);
        const occDate = new Date(cursor.getFullYear(), cursor.getMonth(), day, 12, 0, 0);
        if((!sDate || occDate >= sDate) && (!eDate || occDate <= eDate)) occurrences.push(occDate.toISOString());
        cursor.setMonth(cursor.getMonth() + 1);
        months += 1;
      }
    }
    breakdown.push({ id: r.id, amount: r.amount, occurrences });
  }
  return breakdown;
}

console.log('computeFixedSum ->', computeFixedSum(fixedRows));
console.log('buildFixedBreakdown ->', JSON.stringify(buildFixedBreakdown(fixedRows), null, 2));
