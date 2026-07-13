import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DiaryEntry } from '@shiroani/shared';
import type { IDayGroup, IDiaryTimelineView } from './DiaryTimeline.types';

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKeyFor(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Formats a day-group heading like "Dziś · 19.04 · piątek" / "Today · 04/19 · Friday".
 * Date components use Intl.DateTimeFormat under the active locale; weekday and
 * full-date variants follow shape conventions of the locale.
 */
function formatDayHeader(dateStr: string, t: TFunction<'diary'>, locale: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const prefix = isSameDay(d, now)
    ? t('timeline.today')
    : isSameDay(d, yesterday)
      ? t('timeline.yesterday')
      : null;

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);

  if (prefix) {
    // Relative prefix ("Today"/"Yesterday") already conveys the day, so the
    // weekday third segment is redundant — cap the header at two segments.
    const dm = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(d);
    return `${prefix} · ${dm}`;
  }
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
  return `${dayMonth} · ${weekday}`;
}

function groupByDay(entries: DiaryEntry[], t: TFunction<'diary'>, locale: string): IDayGroup[] {
  const groups = new Map<string, IDayGroup>();
  for (const entry of entries) {
    const key = dayKeyFor(entry.createdAt);
    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(key, {
        key,
        header: formatDayHeader(entry.createdAt, t, locale),
        entries: [entry],
      });
    }
  }
  return Array.from(groups.values());
}

export function useDiaryTimeline(entries: DiaryEntry[]): IDiaryTimelineView {
  const { t, i18n } = useTranslation('diary');
  const groups = useMemo(() => groupByDay(entries, t, i18n.language), [entries, t, i18n.language]);
  return { groups };
}
