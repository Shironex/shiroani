import { toLocalDate, formatDate as sharedFormatDate } from '@shiroani/shared';
import i18n from '@/lib/i18n';

export { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';

/** Resolve the active UI locale, falling back to the OS locale. */
function activeLocale(): string {
  return i18n.language || (typeof navigator !== 'undefined' ? navigator.language : 'en');
}

/**
 * Locale-aware wrapper around the shared `formatDate` helper. Re-exported so
 * tests and other schedule helpers can format dates without re-importing
 * `i18n` everywhere.
 */
export function formatDate(dateStr: string, format: 'short' | 'long' = 'long'): string {
  return sharedFormatDate(dateStr, activeLocale(), format);
}

// Cache `Intl.DateTimeFormat` instances per locale + option-shape. Schedule
// headers render dozens of slots per re-render and the locale is identical
// across them; constructing a fresh formatter per call was wasteful.
const timeFormatters = new Map<string, Intl.DateTimeFormat>();
function getTimeFormatter(locale: string): Intl.DateTimeFormat {
  let f = timeFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
    timeFormatters.set(locale, f);
  }
  return f;
}

const dayHeadingFormatters = new Map<string, Intl.DateTimeFormat>();
function getDayHeadingFormatter(locale: string): Intl.DateTimeFormat {
  let f = dayHeadingFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    dayHeadingFormatters.set(locale, f);
  }
  return f;
}

const weekRangeFormatters = new Map<string, Intl.DateTimeFormat>();
function getWeekRangeFormatter(locale: string): Intl.DateTimeFormat {
  let f = weekRangeFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' });
    weekRangeFormatters.set(locale, f);
  }
  return f;
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return getTimeFormatter(activeLocale()).format(d);
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function isToday(dateStr: string): boolean {
  return dateStr === toLocalDate(new Date());
}

/** Parse the day-of-month number from a YYYY-MM-DD string */
export function getDayNumber(dateStr: string): number {
  return parseInt(dateStr.split('-')[2], 10);
}

/** Slot status relative to `now` (unix seconds). `live` window = 30 minutes. */
export type SlotStatus = 'done' | 'live' | 'soon';

export const LIVE_WINDOW_SECONDS = 30 * 60; // 30 minutes

export function getSlotStatus(airingAt: number, nowSeconds: number): SlotStatus {
  if (airingAt <= nowSeconds - LIVE_WINDOW_SECONDS) return 'done';
  if (airingAt <= nowSeconds) return 'live';
  return 'soon';
}

/**
 * Compact countdown string — "T-2h 15m", "T-5m", "T+12m" (negative = past/live).
 * Returns an empty string if the timestamp is very far out (> 48h).
 */
export function formatCountdown(airingAt: number, nowSeconds: number): string {
  const diff = airingAt - nowSeconds;
  const abs = Math.abs(diff);
  // Far future / far past → no countdown
  if (abs > 48 * 3600) return '';
  const sign = diff < 0 ? '+' : '-';
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  if (hours === 0) return `T${sign}${minutes}m`;
  if (minutes === 0) return `T${sign}${hours}h`;
  return `T${sign}${hours}h ${minutes}m`;
}

/**
 * Short "day + date" label for day-timeline header (e.g. "Friday, April 19"
 * in en-US, "piątek, 19 kwietnia" in pl-PL).
 *
 * Uses a single `Intl.DateTimeFormat` call so part ordering follows the
 * locale and Polish gets the correct genitive month form ("kwietnia",
 * not nominative "kwiecień"). Falls back to `formatDate` when Intl fails.
 */
export function formatDayHeading(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const formatted = getDayHeadingFormatter(activeLocale()).format(dt);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return formatDate(dateStr);
  }
}

/**
 * Range label for week views, e.g. "April 15 – 21" (en-US) or
 * "15–21 kwietnia" (pl-PL). Delegates to `formatRange` so part ordering
 * and the range separator follow the locale automatically.
 */
export function formatWeekRange(first: string, last: string): string {
  try {
    const [y1, m1, d1] = first.split('-').map(Number);
    const [y2, m2, d2] = last.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);
    return getWeekRangeFormatter(activeLocale()).formatRange(start, end);
  } catch {
    return `${formatDate(first)} – ${formatDate(last)}`;
  }
}
