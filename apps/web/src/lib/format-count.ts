/**
 * Locale-aware integer formatter for stat counters. Uses `Intl.NumberFormat`
 * so grouping follows the active locale (e.g. `1,234` in en, `1 234` in pl)
 * instead of a hand-rolled comma→space regex that corrupts comma-decimal
 * locales. The single shared formatter keeps every stat site (profile sidebar,
 * dashboard summary, MAL panel, diary breakdowns) rendering numbers identically.
 */
export function formatCount(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}
