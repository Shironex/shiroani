import { toLocalDate, formatDate } from '@shiroani/shared';
import i18n from '@/lib/i18n';

export { formatDate };
export { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';

/** Resolve the active UI locale, falling back to the OS locale. */
function activeLocale(): string {
  return i18n.language || (typeof navigator !== 'undefined' ? navigator.language : 'en');
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString(activeLocale(), { hour: '2-digit', minute: '2-digit' });
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
 * Short "day + date" label for day-timeline header (e.g. "Friday, April 19").
 * Falls back to `formatDate` when Intl fails.
 */
export function formatDayHeading(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const locale = activeLocale();
    const weekday = dt.toLocaleDateString(locale, { weekday: 'long' });
    const day = dt.getDate();
    const month = dt.toLocaleDateString(locale, { month: 'long' });
    const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${cap}, ${day} ${month}`;
  } catch {
    return formatDate(dateStr);
  }
}

/** Range label for week views, e.g. "April 15–21". */
export function formatWeekRange(first: string, last: string): string {
  try {
    const [y1, m1, d1] = first.split('-').map(Number);
    const [y2, m2, d2] = last.split('-').map(Number);
    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);
    const locale = activeLocale();
    const monthStart = start.toLocaleDateString(locale, { month: 'long' });
    const monthEnd = end.toLocaleDateString(locale, { month: 'long' });
    if (monthStart === monthEnd && y1 === y2) {
      return `${start.getDate()}–${end.getDate()} ${monthEnd}`;
    }
    return `${start.getDate()} ${monthStart} – ${end.getDate()} ${monthEnd}`;
  } catch {
    return `${formatDate(first)} – ${formatDate(last)}`;
  }
}
