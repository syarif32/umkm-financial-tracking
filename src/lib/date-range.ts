/**
 * Small date-bucketing helpers for the financial dashboard. Deliberately
 * UTC-based (not local-timezone-aware) to keep "day" and "month" boundaries
 * deterministic and simple — transaction_date is stored as timestamptz and
 * returned by PostgREST in UTC, so slicing the first 10 characters of that
 * string always gives the correct UTC calendar date.
 */

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Start-of-day instant (UTC) for a 'YYYY-MM-DD' string, as a full ISO timestamp. */
export function startOfUtcDayIso(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDateOnly(d);
}

/** Every 'YYYY-MM-DD' from `from` to `to`, inclusive. */
export function eachDateOnlyInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 3660) {
    dates.push(cursor);
    cursor = addDaysToDateOnly(cursor, 1);
    guard += 1;
  }
  return dates;
}

/** 'YYYY-MM-DD' -> 'YYYY-MM'. */
export function monthKey(dateOnly: string): string {
  return dateOnly.slice(0, 7);
}

export function addMonthsToMonthKey(month: string, months: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
