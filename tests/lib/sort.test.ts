import { stableSortByDateAsc, stableSortByDateDesc } from '@/lib/sort';

describe('stable sort by date', () => {
  test('asc sorts by date and preserves order on ties', () => {
    const arr = [
      { id: 'a', date: '2023-01-02' },
      { id: 'b', date: '2023-01-01' },
      { id: 'c', date: '2023-01-01' },
      { id: 'd', date: '2023-01-03' },
    ];
    const sorted = stableSortByDateAsc(arr, (x) => x.date);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  test('desc sorts by date and preserves order on ties', () => {
    const arr = [
      { id: 'a', date: '2023-01-02' },
      { id: 'b', date: '2023-01-01' },
      { id: 'c', date: '2023-01-01' },
      { id: 'd', date: '2023-01-03' },
    ];
    const sorted = stableSortByDateDesc(arr, (x) => x.date);
    expect(sorted.map((r) => r.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  test('handles undefined or invalid dates by treating them as 0', () => {
    const arr = [
      { id: 'a', date: undefined },
      { id: 'b', date: 'invalid-date' },
      { id: 'c', date: '2023-01-01' },
    ];
    const asc = stableSortByDateAsc(arr, (x) => x.date);
    expect(asc.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
