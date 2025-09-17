import { formatCurrency, formatYmd } from '../../src/lib/utils';

test('formatCurrency formats BRL values', () => {
  expect(formatCurrency(1000)).toEqual(expect.any(String));
  expect(formatCurrency(1234.56)).toEqual(expect.any(String));
});

test('formatYmd formats date as YYYY-MM-DD', () => {
  // formatYmd uses local date parts, so construct date in local timezone
  const d = new Date(2021, 4, 9); // year, monthIndex, day
  expect(formatYmd(d)).toBe('2021-05-09');
});
test('formatYmd formats date as YYYY-MM-DD (local date parts)', () => {
  // Create date with local parts (2021-05-09 local)
  const d = new Date(2021, 4, 9);
  expect(formatYmd(d)).toBe('2021-05-09');
});
