/**
 * Utilities for handling recurring transactions (expenses/incomes)
 * Centralizes logic for counting and expanding recurring occurrences
 * @module lib/recurring-utils
 */

/**
 * Counts the number of monthly occurrences of a recurring record within a date range.
 * 
 * This function considers:
 * - The recurring record's start date (recStart)
 * - The recurring record's end date (recEnd)
 * - The day of month the transaction occurs (recordDay, with fallback to recStart's day)
 * - The period window (periodStart to periodEnd)
 * 
 * @param recStart - The start date of the recurring series (null = series starts before 1900)
 * @param recEnd - The end date of the recurring series (null = series continues indefinitely)
 * @param recordDay - The day of month for this recurring transaction (null = use recStart's day)
 * @param periodStart - Start of the period to count occurrences within
 * @param periodEnd - End of the period to count occurrences within
 * @returns Number of occurrences within the period (0-24 for monthly recurring)
 * 
 * @example
 * // Count occurrences of a salary (15th of each month) in September 2025
 * const count = countFixedOccurrences(
 *   new Date('2025-01-01'),  // recStart
 *   null,                      // recEnd (no end date)
 *   15,                        // recordDay (15th)
 *   new Date('2025-09-01'),   // periodStart
 *   new Date('2025-09-30')    // periodEnd
 * );
 * // Returns: 1 (one occurrence on 2025-09-15)
 */
export function countFixedOccurrences(
  recStart?: Date | null,
  recEnd?: Date | null,
  recordDay?: number | null,
  periodStart?: Date,
  periodEnd?: Date,
): number {
  if (!periodStart || !periodEnd) return 0;

  const start = recStart && recStart > periodStart ? recStart : periodStart;
  const end = recEnd && recEnd < periodEnd ? recEnd : periodEnd;

  if (!start || !end) return 0;
  if (start.getTime() > end.getTime()) return 0;

  // Iterate month by month from start's month to end's month
  let count = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor.getTime() <= last.getTime()) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();

    // Use recordDay if provided, otherwise fall back to recStart's day
    const day =
      recordDay && recordDay > 0
        ? Math.min(recordDay, lastDay)
        : Math.min(recStart ? new Date(recStart).getDate() : 1, lastDay);

    const occDate = new Date(year, monthIndex, day);

    if (occDate.getTime() >= +periodStart && occDate.getTime() <= +periodEnd) {
      count += 1;
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return count;
}

/**
 * Counts monthly occurrences for a window with optional default end date.
 * Used in dashboard charts for calculating variations across months.
 * 
 * @param recStart - Start date of recurring series
 * @param recEnd - End date of recurring series
 * @param dayOfMonth - Day of month for the transaction
 * @param windowStart - Start of the observation window (defaults to recStart)
 * @param windowEnd - End of the observation window (defaults to today if not provided)
 * @returns Number of occurrences in the window
 */
export function countMonthlyOccurrences(
  recStart?: Date | null,
  recEnd?: Date | null,
  dayOfMonth?: number | null,
  windowStart?: Date,
  windowEnd?: Date,
): number {
  if (!recStart) return 0;

  const start = recStart;
  const end = recEnd ?? windowEnd ?? new Date();
  const from =
    start > (windowStart ?? start) ? start : windowStart ?? start;
  const to =
    end < (windowEnd ?? end) ? end : windowEnd ?? end;

  if (from.getTime() > to.getTime()) return 0;

  // Compute first candidate month
  let y1 = from.getFullYear();
  let m1 = from.getMonth();
  const lastDayFirst = new Date(y1, m1 + 1, 0).getDate();
  const occDayFirst = Math.min(dayOfMonth ?? from.getDate(), lastDayFirst);
  const occDateFirst = new Date(y1, m1, occDayFirst);

  // If first candidate is before window, advance to second month
  let y = y1;
  let m = m1;
  if (occDateFirst.getTime() < from.getTime()) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  // Iterate forward until end of window
  let count = 0;
  const cursor = new Date(y, m, 1);
  const endCursor = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cursor.getTime() <= endCursor.getTime()) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const dayToUse = Math.min(dayOfMonth ?? from.getDate(), lastDay);
    const occDate = new Date(year, monthIndex, dayToUse);

    if (occDate.getTime() >= from.getTime() && occDate.getTime() <= to.getTime()) {
      count += 1;
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return count;
}
