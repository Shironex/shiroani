const BYTES_PER_MB = 1024 * 1024;

// Cache `Intl.NumberFormat` per locale. `formatMB` runs twice per
// download-progress tick (~200–500ms cadence from electron-updater) so
// allocating a fresh formatter per call wastes ~1–2 KB per allocation
// for the duration of a multi-hundred-MB download.
const mbFormatters = new Map<string, Intl.NumberFormat>();
function getMbFormatter(locale: string): Intl.NumberFormat {
  let f = mbFormatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    mbFormatters.set(locale, f);
  }
  return f;
}

/** Format bytes as `X.Y MB` with 1 decimal, using a locale-aware decimal separator. */
export function formatMB(bytes: number, locale: string): string {
  const value = Number.isFinite(bytes) && bytes > 0 ? bytes / BYTES_PER_MB : 0;
  return getMbFormatter(locale).format(value) + ' MB';
}

/**
 * Lightweight relative-time formatter for recent events using Intl APIs.
 * Falls back to a locale-aware clock/date for events older than ~6 hours.
 */
export function formatRelativeTime(
  epochMs: number | null,
  locale: string,
  justNow: string,
  todayTemplate: (time: string) => string
): string | null {
  if (epochMs == null) return null;
  const now = Date.now();
  const diff = now - epochMs;
  if (diff < 0) return null;
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return justNow;
  const min = Math.floor(sec / 60);
  if (min < 1) return justNow;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'short' });
  if (min < 60) return rtf.format(-min, 'minute');
  const hrs = Math.floor(min / 60);
  if (hrs < 6) return rtf.format(-hrs, 'hour');
  // Older than ~6h — fall back to a clock time, prefixed with locale-aware "today" when same day.
  const then = new Date(epochMs);
  const sameDay = new Date(now).toDateString() === then.toDateString();
  const clock = then.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return sameDay ? todayTemplate(clock) : then.toLocaleDateString(locale);
}
