import type { AiringAnime, AnimeDetailFuzzyDate, AnimeEntry } from '@shiroani/shared';
import type { TFunction } from 'i18next';

/** Criteria for matching an existing library entry. Each provided field is OR-ed. */
export interface LibraryMatch {
  /** AniList id — matches an entry's `anilistId`. */
  anilistId?: number;
  /** Title — matches an entry's `title` case-insensitively. */
  title?: string;
  /** Resume URL — matches an entry's `resumeUrl` exactly (both must be truthy). */
  url?: string;
}

/**
 * Whether the library already contains an entry matching any of the provided
 * criteria. Mirrors the dedupe rules the add-to-library call sites used inline:
 * AniList-id match, case-insensitive title match, and (for browser-sourced
 * entries) exact resume-URL match.
 */
export function isAlreadyInLibrary(
  entries: ReadonlyArray<AnimeEntry>,
  match: LibraryMatch
): boolean {
  const normalizedTitle = match.title?.toLowerCase();
  return entries.some(e => {
    if (match.anilistId !== undefined && e.anilistId === match.anilistId) return true;
    if (normalizedTitle !== undefined && e.title.toLowerCase() === normalizedTitle) return true;
    if (match.url && e.resumeUrl && e.resumeUrl === match.url) return true;
    return false;
  });
}

export function getAnimeTitle(media: AiringAnime['media']): string {
  return media.title.romaji || media.title.english || media.title.native || '?';
}

export function getCoverUrl(media: AiringAnime['media']): string | undefined {
  return media.coverImage.medium || media.coverImage.large;
}

/**
 * Format episode progress using the active locale's translation key.
 * Callers in React components must hold a `useTranslation('common')` subscription
 * so re-renders fire when the language changes.
 */
export function formatEpisodeProgress(
  t: TFunction,
  current: number,
  total?: number | null
): string {
  return total
    ? t('episodeProgress', { current, total })
    : t('episodeProgressNoTotal', { current });
}

/** Format a raw AniList score (0-100) to display format (0.0-10.0) */
export function formatRawScore(anilistScore: number): string {
  return (anilistScore / 10).toFixed(1);
}

/**
 * Format an AniList FuzzyDate using Intl.DateTimeFormat for locale-aware
 * date display. Falls back to `DD.MM.YYYY` if Intl is unavailable.
 */
export function formatFuzzyDate(date?: AnimeDetailFuzzyDate, locale?: string): string | null {
  if (!date?.year) return null;
  try {
    // Build a JS Date. AniList fuzzy dates may omit day/month.
    const month = date.month ?? 1;
    const day = date.day ?? 1;
    const dt = new Date(date.year, month - 1, day);

    const options: Intl.DateTimeFormatOptions = { year: 'numeric' };
    if (date.month) options.month = '2-digit';
    if (date.day) options.day = '2-digit';

    return new Intl.DateTimeFormat(locale ?? 'en', options).format(dt);
  } catch {
    // Intl not available — manual fallback
    const parts: string[] = [];
    if (date.day) parts.push(String(date.day).padStart(2, '0'));
    if (date.month) parts.push(String(date.month).padStart(2, '0'));
    parts.push(String(date.year));
    return parts.join('.');
  }
}

/**
 * Format seconds until airing to a compact countdown string (e.g. "2d 5h", "3h 20m", "45m").
 * The d/h/m abbreviations are intentionally locale-neutral compact notation.
 */
export function formatTimeUntilAiring(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
