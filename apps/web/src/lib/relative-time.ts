import type { TFunction } from 'i18next';

/**
 * Compact "time ago" formatter keyed off the `browser:newTab.recents.relative`
 * strings (now / m / h / d / w / mo). Shared by the new-tab recents rows and
 * the browsing-history view so both render identical relative timestamps.
 */
export function formatRelativeTime(timestamp: number, t: TFunction<'browser'>): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('newTab.recents.relative.now');
  if (minutes < 60) return t('newTab.recents.relative.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('newTab.recents.relative.hours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('newTab.recents.relative.days', { count: days });
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (months < 1) return t('newTab.recents.relative.weeks', { count: weeks });
  return t('newTab.recents.relative.months', { count: months });
}
