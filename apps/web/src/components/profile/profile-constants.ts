// ── Formatters & Constants ──────────────────────────────────────

import { useTranslation } from 'react-i18next';

export function formatDays(minutes: number): string {
  const days = minutes / 60 / 24;
  return days >= 1 ? `${days.toFixed(1)}` : `${(minutes / 60).toFixed(1)}h`;
}

/**
 * Static fallback unit label (Polish — matches the previous behaviour). Kept for
 * callers that can't use hooks; new code should prefer {@link useDaysLabel}.
 */
export function formatDaysLabel(minutes: number): string {
  return minutes / 60 / 24 >= 1 ? 'dni' : 'godzin';
}

/**
 * Localized unit label for the "time spent" stat — "days" once the total crosses
 * one day, otherwise "hours". Translations live in `profile:units.*`. Mirrors the
 * {@link useStatusLabels} hook so the label follows the active language.
 */
export function useDaysLabel(): (minutes: number) => string {
  const { t } = useTranslation('profile');
  return (minutes: number) => (minutes / 60 / 24 >= 1 ? t('units.days') : t('units.hours'));
}

/** Format an already-0-10 mean score for display (e.g. profile statistics). */
export function formatScoreOutOf10(score: number): string {
  return score > 0 ? score.toFixed(1) : '—';
}

/**
 * Locale-aware integer formatter for the profile stat counters. Uses
 * `Intl.NumberFormat` so grouping follows the active locale (e.g. `1,234` in
 * en, `1 234` in pl) instead of a hand-rolled comma→space regex that corrupts
 * comma-decimal locales. The single shared formatter keeps every sibling stat
 * site (sidebar, dashboard summary, MAL panel) rendering numbers identically.
 */
export function formatCount(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

/**
 * Localized AniList status labels keyed by the upstream enum value
 * (`CURRENT`, `COMPLETED`, …). Translations live in `profile:rings.labels.*`.
 *
 * Returned object is recreated on each render but cheap (5 keys); React's
 * referential-equality tools (memo / useMemo) at the call-site can wrap it
 * if needed.
 */
export function useStatusLabels(): Record<string, string> {
  const { t } = useTranslation('profile');
  return {
    CURRENT: t('rings.labels.current'),
    COMPLETED: t('rings.labels.completed'),
    PLANNING: t('rings.labels.planning'),
    DROPPED: t('rings.labels.dropped'),
    PAUSED: t('rings.labels.paused'),
    REPEATING: t('rings.labels.repeating'),
  };
}

/**
 * Static fallback labels (Polish — matches the previous behaviour). Kept for
 * components that can't easily call hooks; new code should prefer
 * {@link useStatusLabels}.
 */
export const STATUS_LABELS: Record<string, string> = {
  CURRENT: 'Oglądam',
  COMPLETED: 'Ukończone',
  PLANNING: 'Planowane',
  DROPPED: 'Porzucone',
  PAUSED: 'Wstrzymane',
  REPEATING: 'Powtarzam',
};
