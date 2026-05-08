// ── Formatters & Constants ──────────────────────────────────────

import { useTranslation } from 'react-i18next';

export function formatDays(minutes: number): string {
  const days = minutes / 60 / 24;
  return days >= 1 ? `${days.toFixed(1)}` : `${(minutes / 60).toFixed(1)}h`;
}

export function formatDaysLabel(minutes: number): string {
  return minutes / 60 / 24 >= 1 ? 'dni' : 'godzin';
}

export function formatScore(score: number): string {
  return score > 0 ? score.toFixed(1) : '—';
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

export const STATUS_COLORS: Record<string, string> = {
  CURRENT: 'var(--status-success)',
  COMPLETED: 'var(--primary)',
  PLANNING: 'var(--status-info)',
  DROPPED: 'var(--destructive)',
  PAUSED: 'var(--status-warning)',
  REPEATING: 'var(--status-info)',
};

export const FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'Krótki serial TV',
  MOVIE: 'Film',
  SPECIAL: 'Odcinek specjalny',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Muzyka',
};
