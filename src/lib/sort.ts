// Utilities for stable sorting by date
export function stableSortByDateAsc<T>(arr: T[], getDate: (t: T) => string | Date | undefined | null): T[] {
  return arr
    .map((it, idx) => ({ it, idx }))
    .sort((a, b) => {
      const ta = parseToTime(getDate(a.it));
      const tb = parseToTime(getDate(b.it));
      if (ta === tb) return a.idx - b.idx;
      return ta - tb;
    })
    .map((x) => x.it);
}

export function stableSortByDateDesc<T>(arr: T[], getDate: (t: T) => string | Date | undefined | null): T[] {
  return arr
    .map((it, idx) => ({ it, idx }))
    .sort((a, b) => {
      const ta = parseToTime(getDate(a.it));
      const tb = parseToTime(getDate(b.it));
      if (ta === tb) return a.idx - b.idx;
      return tb - ta;
    })
    .map((x) => x.it);
}

function parseToTime(v: string | Date | undefined | null): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// no default export
