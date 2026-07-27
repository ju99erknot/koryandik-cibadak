/**
 * Local-date helpers.
 *
 * `new Date().toISOString().split('T')[0]` returns the date in **UTC**, not in
 * the user's timezone. For WIB (UTC+7) that means between 00:00 and 06:59
 * local time the result is still *yesterday*, so "today" markers, default
 * form values and deadline comparisons are all off by one day.
 *
 * These helpers format using the local calendar fields instead.
 */

/** Format a Date as `YYYY-MM-DD` using local calendar fields. */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's date as `YYYY-MM-DD` in the user's own timezone. */
export function todayLocal(): string {
  return toLocalDateString(new Date());
}
