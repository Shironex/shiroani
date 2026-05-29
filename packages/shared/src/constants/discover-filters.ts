/**
 * Discover browse/search sort + filter vocabulary.
 *
 * Static, offline-safe lists that mirror the subset of AniList's media query
 * arguments we surface in the UI. Shared so the renderer (filter UI), the zod
 * payload schemas, and the desktop AniList query layer all agree on the wire
 * shape — no enum drift between layers.
 */

/** User-selectable sort modes for the browse tabs (item 2). */
export const DISCOVER_SORTS = ['score', 'popularity', 'releaseDate', 'title'] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

/** Maps a UI sort mode to its AniList `MediaSort` enum value. */
export const DISCOVER_SORT_TO_ANILIST: Record<DiscoverSort, string> = {
  score: 'SCORE_DESC',
  popularity: 'POPULARITY_DESC',
  releaseDate: 'START_DATE_DESC',
  title: 'TITLE_ROMAJI',
};

/** AniList `MediaFormat` values offered as a filter (item 6). */
export const DISCOVER_FORMATS = [
  'TV',
  'TV_SHORT',
  'MOVIE',
  'SPECIAL',
  'OVA',
  'ONA',
  'MUSIC',
] as const;
export type DiscoverFormat = (typeof DISCOVER_FORMATS)[number];

/** AniList `MediaStatus` (airing status) values offered as a filter (item 6). */
export const DISCOVER_STATUSES = [
  'RELEASING',
  'FINISHED',
  'NOT_YET_RELEASED',
  'CANCELLED',
  'HIATUS',
] as const;
export type DiscoverAiringStatus = (typeof DISCOVER_STATUSES)[number];

/** AniList `MediaSeason` values offered as a filter (item 6). */
export const DISCOVER_SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const;
export type DiscoverSeason = (typeof DISCOVER_SEASONS)[number];

/** Earliest selectable release year for the year filter. */
export const DISCOVER_MIN_YEAR = 1960;

/** Score range bounds (AniList averageScore is 0–100). */
export const DISCOVER_SCORE_MIN = 0;
export const DISCOVER_SCORE_MAX = 100;

/**
 * Advanced browse/search filters (item 6). Every field is optional — an empty
 * object means "no extra filtering" and the tab's intrinsic defaults apply.
 *
 * `genre_in` / `genre_not_in` are reused from the existing Random tab picker.
 * `tag_in` works directly on AniList's `media()` field. Studio is intentionally
 * absent: AniList's `media()` query has no studio argument (studio filtering
 * lives behind a separate `Studio(search:){ media }` shape), so it isn't part
 * of this unified filter surface.
 */
export interface DiscoverFilters {
  includedGenres?: string[];
  excludedGenres?: string[];
  tags?: string[];
  format?: DiscoverFormat;
  status?: DiscoverAiringStatus;
  year?: number;
  season?: DiscoverSeason;
  /** averageScore lower bound, 0–100. */
  scoreMin?: number;
  /** averageScore upper bound, 0–100. */
  scoreMax?: number;
}

/** True when the filter object carries at least one active constraint. */
export function hasActiveDiscoverFilters(f: DiscoverFilters | undefined): boolean {
  if (!f) return false;
  return Boolean(
    f.includedGenres?.length ||
      f.excludedGenres?.length ||
      f.tags?.length ||
      f.format ||
      f.status ||
      f.year ||
      f.season ||
      (f.scoreMin != null && f.scoreMin > DISCOVER_SCORE_MIN) ||
      (f.scoreMax != null && f.scoreMax < DISCOVER_SCORE_MAX)
  );
}

/**
 * A short, stable signature of a filter+sort combination, used to vary AniList
 * cache keys so filtered results never collide with unfiltered ones.
 */
export function discoverFilterSignature(
  sort: DiscoverSort | undefined,
  f: DiscoverFilters | undefined
): string {
  if (!sort && !hasActiveDiscoverFilters(f)) return '';
  const parts: string[] = [];
  if (sort) parts.push(`s=${sort}`);
  if (f?.includedGenres?.length) parts.push(`gi=${[...f.includedGenres].sort().join('+')}`);
  if (f?.excludedGenres?.length) parts.push(`ge=${[...f.excludedGenres].sort().join('+')}`);
  if (f?.tags?.length) parts.push(`tg=${[...f.tags].sort().join('+')}`);
  if (f?.format) parts.push(`fmt=${f.format}`);
  if (f?.status) parts.push(`st=${f.status}`);
  if (f?.year) parts.push(`yr=${f.year}`);
  if (f?.season) parts.push(`se=${f.season}`);
  if (f?.scoreMin != null) parts.push(`smin=${f.scoreMin}`);
  if (f?.scoreMax != null) parts.push(`smax=${f.scoreMax}`);
  return parts.join('|');
}
