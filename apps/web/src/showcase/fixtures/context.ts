import { LANGUAGE_STORAGE_KEY } from '@shiroani/shared';

export type FixtureLang = 'en' | 'pl';

/** The capture language, as seeded into localStorage by the showcase config. */
export function fixtureLang(): FixtureLang {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'pl' ? 'pl' : 'en';
  } catch {
    return 'en';
  }
}

export function pick<T>(value: { en: T; pl: T }): T {
  return value[fixtureLang()];
}

/**
 * A local wall-clock moment relative to "now". The capture freezes the clock,
 * so every date here lands on the same weekday and hour on every run, whatever
 * the machine's time zone is.
 */
export function localMoment(dayOffset: number, hour = 12, minute = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute);
}

export function isoAt(dayOffset: number, hour = 12, minute = 0): string {
  return localMoment(dayOffset, hour, minute).toISOString();
}

export function unixAt(dayOffset: number, hour = 12, minute = 0): number {
  return Math.floor(localMoment(dayOffset, hour, minute).getTime() / 1000);
}

/** `YYYY-MM-DD` of a local date, the key format the schedule store uses. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from today to a `YYYY-MM-DD` key (negative for the past). */
export function dayOffsetOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = localMoment(0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
