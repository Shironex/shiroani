/**
 * Shared Formatters
 */

/**
 * Polish pluralization following correct grammatical rules.
 *
 * Rules:
 * - 1 -> singular (one)
 * - 2-4, 22-24, 32-34... (last digit 2-4, excluding teens 12-14) -> few
 * - Everything else (0, 5-21, 25-31...) -> many
 */
export function pluralize(count: number, one: string, few: string, many: string): string {
  if (count === 1) return `${count} ${one}`;
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} ${few}`;
  }
  return `${count} ${many}`;
}

/**
 * Format a date string in the given BCP-47 locale.
 *
 * Locale resolution lives at the call site — `packages/shared` cannot depend
 * on the renderer's i18next instance, so callers in `apps/web` are expected
 * to pass `i18n.language`. Other surfaces (bot, landing, main process) can
 * pass a fixed locale or the surface's own resolved language.
 *
 * @param dateStr - Date string parseable by `new Date()` (e.g. "2024-01-15")
 * @param locale - BCP-47 locale tag (e.g. `'pl'`, `'en'`, `'pl-PL'`)
 * @param format - 'short' for abbreviated month, 'long' for full month
 */
export function formatDate(
  dateStr: string,
  locale: string,
  format: 'short' | 'long' = 'long'
): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: format,
    year: 'numeric',
  });
}
