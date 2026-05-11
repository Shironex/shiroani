import type { AnimeStatus } from '@shiroani/shared';
import i18n, { tDynamic } from '@/lib/i18n';

/** Path to the app mascot logo (chibi SVG) */
export const APP_LOGO_URL = `${import.meta.env.BASE_URL}shiro-chibi.svg`;

/** Path to the waving mascot pose (used on splash loading variant) */
export const MASCOT_WAVE_URL = `${import.meta.env.BASE_URL}chibi_wave.png`;

/** Path to the sleeping mascot pose (used on splash updating/error + ErrorBoundary) */
export const MASCOT_SLEEP_URL = `${import.meta.env.BASE_URL}chibi_sleep.png`;

// ============================================
// Status — color/style config + i18n helpers
// ============================================
//
// Labels are no longer baked into the map — they live in the `status`
// namespace and are read at call time so they react to language changes.
// Components should use `useTranslation('status')` and `t(STATUS_LABEL_KEY[s])`,
// or call `getStatusLabel(s)` from non-component code (e.g. random-utils).

export const STATUS_CONFIG: Record<
  AnimeStatus,
  { color: string; cssColor: string; cssBgColor: string }
> = {
  watching: {
    color: 'bg-status-info',
    cssColor: 'var(--status-info)',
    cssBgColor: 'var(--status-info-bg)',
  },
  completed: {
    color: 'bg-status-success',
    cssColor: 'var(--status-success)',
    cssBgColor: 'var(--status-success-bg)',
  },
  plan_to_watch: {
    color: 'bg-status-warning',
    cssColor: 'var(--status-warning)',
    cssBgColor: 'var(--status-warning-bg)',
  },
  on_hold: {
    color: 'bg-status-pending',
    cssColor: 'var(--status-pending)',
    cssBgColor: 'var(--status-pending-bg)',
  },
  dropped: {
    color: 'bg-status-error',
    cssColor: 'var(--status-error)',
    cssBgColor: 'var(--status-error-bg)',
  },
};

/** AnimeStatus → translation key (status namespace, camelCase). */
export const STATUS_LABEL_KEY: Record<AnimeStatus, string> = {
  watching: 'watching',
  completed: 'completed',
  plan_to_watch: 'planToWatch',
  on_hold: 'onHold',
  dropped: 'dropped',
};

export const STATUS_ORDER: AnimeStatus[] = Object.keys(STATUS_CONFIG) as AnimeStatus[];

/**
 * Imperative status-label lookup for non-React call sites. React components
 * should prefer `useTranslation('status')` + `t(STATUS_LABEL_KEY[status])` so
 * the value re-renders on language change.
 */
export function getStatusLabel(status: AnimeStatus): string {
  return tDynamic(i18n, `status:${STATUS_LABEL_KEY[status]}`);
}

/**
 * Build the standard status options list for `<Select>` triggers. Returns
 * fresh strings translated at call time — call this inside a `useMemo` keyed
 * on `i18n.language` so React re-renders when the user switches languages.
 */
export function getStatusOptions(): { value: AnimeStatus; label: string }[] {
  return STATUS_ORDER.map(value => ({
    value,
    label: tDynamic(i18n, `status:${STATUS_LABEL_KEY[value]}`),
  }));
}

/**
 * Filter-dropdown variant — same as `getStatusOptions` plus a leading "all"
 * pseudo-option. Call inside a memo keyed on `i18n.language`.
 */
export function getStatusFilterOptions(): {
  value: 'all' | AnimeStatus;
  label: string;
}[] {
  return [{ value: 'all' as const, label: i18n.t('all', { ns: 'status' }) }, ...getStatusOptions()];
}

// ============================================
// AniList Label Maps — i18n-backed getters
// ============================================
//
// Original Polish strings now live in `apps/web/src/locales/{pl,en}/anilist.json`.
// Each getter falls back to the raw enum value when no translation exists, so
// new AniList enum values surface as their machine code rather than blanking.

const ANILIST_FORMAT_KEY: Record<string, string> = {
  TV: 'tv',
  TV_SHORT: 'tvShort',
  MOVIE: 'movie',
  SPECIAL: 'special',
  OVA: 'ova',
  ONA: 'ona',
  MUSIC: 'music',
};

const ANILIST_STATUS_KEY: Record<string, string> = {
  FINISHED: 'finished',
  RELEASING: 'releasing',
  NOT_YET_RELEASED: 'notYetReleased',
  CANCELLED: 'cancelled',
  HIATUS: 'hiatus',
};

const ANILIST_SOURCE_KEY: Record<string, string> = {
  ORIGINAL: 'original',
  MANGA: 'manga',
  LIGHT_NOVEL: 'lightNovel',
  VISUAL_NOVEL: 'visualNovel',
  VIDEO_GAME: 'videoGame',
  NOVEL: 'novel',
  OTHER: 'other',
  ANIME: 'anime',
  WEB_NOVEL: 'webNovel',
  COMIC: 'comic',
};

const ANILIST_SEASON_KEY: Record<string, string> = {
  WINTER: 'winter',
  SPRING: 'spring',
  SUMMER: 'summer',
  FALL: 'fall',
};

const ANILIST_RELATION_KEY: Record<string, string> = {
  ADAPTATION: 'adaptation',
  PREQUEL: 'prequel',
  SEQUEL: 'sequel',
  PARENT: 'parent',
  SIDE_STORY: 'sideStory',
  CHARACTER: 'character',
  SUMMARY: 'summary',
  ALTERNATIVE: 'alternative',
  SPIN_OFF: 'spinOff',
  OTHER: 'other',
  SOURCE: 'source',
  COMPILATION: 'compilation',
  CONTAINS: 'contains',
};

function lookup(group: string, keyMap: Record<string, string>, value: string): string {
  const key = keyMap[value];
  if (!key) return value;
  return i18n.t(`${group}.${key}`, { ns: 'anilist', defaultValue: value });
}

/** Translate an AniList format enum value (e.g. `TV` → `TV`, `MOVIE` → `Film`). */
export function getAnilistFormatLabel(value: string): string {
  return lookup('format', ANILIST_FORMAT_KEY, value);
}

/** Translate an AniList airing-status enum value. */
export function getAnilistStatusLabel(value: string): string {
  return lookup('status', ANILIST_STATUS_KEY, value);
}

/** Translate an AniList source-material enum value. */
export function getAnilistSourceLabel(value: string): string {
  return lookup('source', ANILIST_SOURCE_KEY, value);
}

/** Translate an AniList season enum value. */
export function getAnilistSeasonLabel(value: string): string {
  return lookup('season', ANILIST_SEASON_KEY, value);
}

/** Translate an AniList relation-type enum value. */
export function getAnilistRelationLabel(value: string): string {
  return lookup('relation', ANILIST_RELATION_KEY, value);
}

// ============================================
// Day names — Mon-first ordered arrays
// ============================================

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Mon-first short day names. Re-evaluates on each call against current language. */
export function getDayNamesShort(): string[] {
  return DAY_KEYS.map(k => i18n.t(`day.short.${k}`, { ns: 'common' }));
}

/** Mon-first full day names. Re-evaluates on each call against current language. */
export function getDayNamesFull(): string[] {
  return DAY_KEYS.map(k => i18n.t(`day.full.${k}`, { ns: 'common' }));
}
