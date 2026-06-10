import { Injectable } from '@nestjs/common';
import {
  createLogger,
  extractErrorMessage,
  getCurrentAniListSeason,
  DISCOVER_SORT_TO_ANILIST,
  DISCOVER_SCORE_MIN,
  DISCOVER_SCORE_MAX,
  discoverFilterSignature,
} from '@shiroani/shared';
import type { DiscoverSort, DiscoverFilters, SaveMediaListEntryRequest } from '@shiroani/shared';
import { AniListClient } from './anilist-client';
import {
  ANIME_DETAILS_QUERY,
  AIRING_SCHEDULE_QUERY,
  BROWSE_MEDIA_QUERY,
  RANDOM_BY_GENRE_QUERY,
} from './queries';
import type {
  AniListMedia,
  AniListPageInfo,
  AniListAiringSchedule,
  PaginatedMediaResponse,
  AnimeDetailsResponse,
  AiringScheduleResponse,
} from './types';

/** Local 0–10 score → AniList raw POINT_100 score (0–100). Inlined to keep this
 * module independent of anilist-sync's reconcile.ts (mirrors localScoreToRaw). */
function localScoreToRaw(score: number): number {
  return Math.round(score * 10);
}

const logger = createLogger('AnimeService');

const DEFAULT_PER_PAGE = 20;

export interface PaginatedMediaResult {
  media: AniListMedia[];
  pageInfo: AniListPageInfo;
}

export interface PaginatedAiringResult {
  airingSchedules: AniListAiringSchedule[];
  pageInfo: AniListPageInfo;
}

/**
 * AniList media browsing core: search, trending/popular/seasonal/random
 * discovery, details, airing schedule, and the write-through list-entry save.
 * Profile, social and recommendation reads live in their per-concern siblings
 * ({@link AnimeProfileService}, {@link AnimeSocialService},
 * {@link AnimeRecommendationsService}).
 */
@Injectable()
export class AnimeService {
  constructor(private readonly anilistClient: AniListClient) {
    logger.info('AnimeService initialized');
  }

  /**
   * Search anime by title with pagination, optional user sort + advanced
   * filters (items 2 + 6). Search defaults to POPULARITY_DESC relevance unless
   * the user picks a sort.
   */
  async searchAnime(
    query: string,
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    sort?: DiscoverSort,
    filters?: DiscoverFilters
  ): Promise<PaginatedMediaResult> {
    return this.browseMedia('Searching anime', 'search', {
      page,
      perPage,
      search: query,
      defaultSort: 'POPULARITY_DESC',
      sort,
      filters,
    });
  }

  /**
   * Get full anime details by AniList ID.
   */
  async getAnimeDetails(id: number): Promise<AniListMedia> {
    logger.debug(`Fetching anime details for ID: ${id}`);
    try {
      const data = await this.anilistClient.query<AnimeDetailsResponse>(ANIME_DETAILS_QUERY, {
        id,
      });
      return data.Media;
    } catch (error) {
      logger.error(`Failed to fetch anime details for ID ${id}: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get airing schedule for a date range.
   *
   * @param startDate - Start of the range
   * @param endDate - End of the range
   * @param page - Page number (default 1)
   * @param perPage - Items per page (default 20)
   */
  async getAiringSchedule(
    startDate: Date,
    endDate: Date,
    page = 1,
    perPage = DEFAULT_PER_PAGE
  ): Promise<PaginatedAiringResult> {
    const airingAtGreater = Math.floor(startDate.getTime() / 1000);
    const airingAtLesser = Math.floor(endDate.getTime() / 1000);

    logger.debug(
      `Fetching airing schedule: ${startDate.toISOString()} to ${endDate.toISOString()} (page ${page})`
    );

    try {
      const cacheKey = `airing:${airingAtGreater}:${airingAtLesser}:${page}`;
      const data = await this.anilistClient.cachedQuery<AiringScheduleResponse>(
        cacheKey,
        AIRING_SCHEDULE_QUERY,
        {
          airingAt_greater: airingAtGreater,
          airingAt_lesser: airingAtLesser,
          page,
          perPage,
        }
      );
      return {
        airingSchedules: data.Page.airingSchedules,
        pageInfo: data.Page.pageInfo,
      };
    } catch (error) {
      logger.error(`Failed to fetch airing schedule: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get currently trending anime with pagination. Defaults to TRENDING_DESC
   * unless the user overrides the sort; advanced filters layer on top.
   */
  async getTrending(
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    sort?: DiscoverSort,
    filters?: DiscoverFilters
  ): Promise<PaginatedMediaResult> {
    return this.browseMedia('Fetching trending anime', 'trending', {
      page,
      perPage,
      defaultSort: 'TRENDING_DESC',
      sort,
      filters,
    });
  }

  /**
   * Get popular anime for the current season.
   * Automatically detects the current season and year. Defaults to
   * POPULARITY_DESC; user sort + filters layer on top. Explicit year/season
   * filters override the auto-detected current season.
   */
  async getPopularThisSeason(
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    sort?: DiscoverSort,
    filters?: DiscoverFilters
  ): Promise<PaginatedMediaResult> {
    const { year: seasonYear, season } = getCurrentAniListSeason();

    return this.browseMedia(`Fetching popular anime for ${season} ${seasonYear}`, 'popular', {
      page,
      perPage,
      season,
      seasonYear,
      defaultSort: 'POPULARITY_DESC',
      sort,
      filters,
    });
  }

  /**
   * Get a randomized pool of anime filtered by included/excluded genres.
   *
   * AniList quirks this method works around:
   *  - No RANDOM sort exists → we pick a random page of popularity-sorted results.
   *  - `genre_in` is OR, not AND → for ≥2 included genres we filter the response
   *    so only media containing ALL included genres remain (matches user expectation).
   *  - With tight filters the result set may have far fewer than 20 pages, so a
   *    naive random page in [1..20] often lands on an empty page. We probe page 1
   *    first to learn `lastPage` and clamp accordingly, falling back to page 1 if
   *    the random page survives no AND-filtered matches.
   */
  async getRandomByGenre(
    includedGenres: string[] = [],
    excludedGenres: string[] = [],
    perPage = 50
  ): Promise<PaginatedMediaResult> {
    const baseVars = {
      perPage,
      genre_in: includedGenres.length > 0 ? includedGenres : undefined,
      genre_not_in: excludedGenres.length > 0 ? excludedGenres : undefined,
    };

    const firstPage = await this.queryPagedMedia('Probing random pool', RANDOM_BY_GENRE_QUERY, {
      ...baseVars,
      page: 1,
    });

    const maxPage = Math.min(20, Math.max(1, firstPage.pageInfo.lastPage));
    let pool = firstPage.media;

    if (maxPage > 1) {
      const randomPage = Math.floor(Math.random() * maxPage) + 1;
      if (randomPage !== 1) {
        const random = await this.queryPagedMedia(
          `Fetching random page ${randomPage}`,
          RANDOM_BY_GENRE_QUERY,
          { ...baseVars, page: randomPage }
        );
        pool = random.media;
      }
    }

    // Enforce AND semantics for ≥2 included genres
    if (includedGenres.length >= 2) {
      const matchesAll = (m: AniListMedia) =>
        includedGenres.every(g => (m.genres ?? []).includes(g));
      const filtered = pool.filter(matchesAll);

      // If the random page yielded nothing after AND-filter, fall back to page 1
      if (filtered.length === 0 && pool !== firstPage.media) {
        pool = firstPage.media.filter(matchesAll);
      } else {
        pool = filtered;
      }
    }

    return { media: pool, pageInfo: firstPage.pageInfo };
  }

  /**
   * Get anime for a specific season and year.
   */
  async getSeasonalAnime(
    year: number,
    season: string,
    page = 1,
    perPage = DEFAULT_PER_PAGE,
    sort?: DiscoverSort,
    filters?: DiscoverFilters
  ): Promise<PaginatedMediaResult> {
    return this.browseMedia(`Fetching seasonal anime for ${season} ${year}`, 'seasonal', {
      page,
      perPage,
      season: season.toUpperCase(),
      seasonYear: year,
      defaultSort: 'POPULARITY_DESC',
      sort,
      filters,
    });
  }

  /**
   * Write-through add (item C3): create or update the connected viewer's AniList
   * list entry for a media. Used by Discover to also push a freshly-added anime
   * to the user's AniList list (status defaults to PLANNING). The local 0–10
   * `score` is converted to AniList's POINT_100 raw scale; absent optional fields
   * are NOT written, so AniList leaves existing remote values untouched. Returns
   * the AniList `updatedAt` (epoch seconds) the server stamped, or `null` when
   * not connected (so the caller can no-op rather than surface an auth error).
   */
  async saveMediaListEntry(input: SaveMediaListEntryRequest): Promise<number | null> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('saveMediaListEntry: not connected, returning null');
      return null;
    }

    logger.info(`Write-through saving AniList list entry for media ${input.mediaId}`);
    try {
      const updatedAt = await this.anilistClient.saveMediaListEntry({
        mediaId: input.mediaId,
        status: input.status ?? 'PLANNING',
        progress: input.progress,
        scoreRaw: input.score != null ? localScoreToRaw(input.score) : undefined,
        notes: input.notes,
      });
      return updatedAt;
    } catch (error) {
      logger.error(
        `Failed to save AniList list entry for media ${input.mediaId}: ${extractErrorMessage(error)}`
      );
      throw error;
    }
  }

  /**
   * Unified browse/search path (items 2 + 6). Builds the `BROWSE_MEDIA_QUERY`
   * variable set from a mode default plus the optional user sort and advanced
   * filters, then routes through `queryPagedMedia`.
   *
   * Cache key folds in a filter+sort signature so filtered results never serve
   * stale unfiltered data under the same `mode:page` key. The pristine
   * (no sort, no filters) case keeps the original short keys for cache reuse.
   */
  private async browseMedia(
    description: string,
    mode: 'trending' | 'popular' | 'seasonal' | 'search',
    opts: {
      page: number;
      perPage: number;
      search?: string;
      season?: string;
      seasonYear?: number;
      defaultSort: string;
      sort?: DiscoverSort;
      filters?: DiscoverFilters;
    }
  ): Promise<PaginatedMediaResult> {
    const { page, perPage, search, season, seasonYear, defaultSort, sort, filters } = opts;

    const f = filters ?? {};
    const anilistSort = sort ? DISCOVER_SORT_TO_ANILIST[sort] : defaultSort;

    // Explicit year/season filters override the mode's intrinsic season.
    const effectiveSeason = f.season ?? season;
    const effectiveYear = f.year ?? seasonYear;

    // AniList averageScore_greater/_lesser are exclusive — convert inclusive
    // bounds and drop the no-op extremes.
    const scoreGreater =
      f.scoreMin != null && f.scoreMin > DISCOVER_SCORE_MIN ? f.scoreMin - 1 : undefined;
    const scoreLesser =
      f.scoreMax != null && f.scoreMax < DISCOVER_SCORE_MAX ? f.scoreMax + 1 : undefined;

    // The `onList`/`mediaListEntry` selection is viewer-specific and requires a
    // token; unauthed it resolves to null but the EXCLUDE filter arg is a no-op
    // (nothing is on the list), so gate it on auth. `connected` also drives
    // whether we trust `mediaListEntry` to derive the flat `onList` flag.
    const connected = await this.anilistClient.hasToken();
    const onList = connected && f.excludeOnList ? false : undefined;

    const variables: Record<string, unknown> = {
      page,
      perPage,
      search: search || undefined,
      sort: [anilistSort],
      season: effectiveSeason,
      seasonYear: effectiveYear,
      format: f.format,
      status: f.status,
      genre_in: f.includedGenres?.length ? f.includedGenres : undefined,
      genre_not_in: f.excludedGenres?.length ? f.excludedGenres : undefined,
      tag_in: f.tags?.length ? f.tags : undefined,
      averageScore_greater: scoreGreater,
      averageScore_lesser: scoreLesser,
      onList,
    };

    // Search is never cached (query-space too large); browse tabs cache by
    // mode:season:year:page plus the filter/sort signature. Fold the connected
    // bit into the key so a page fetched logged-out doesn't serve stale
    // `onList:false` to a logged-in viewer (and vice-versa) within the TTL.
    let cacheKey: string | undefined;
    if (mode !== 'search') {
      const sig = discoverFilterSignature(sort, filters);
      const base =
        mode === 'trending'
          ? `trending:${page}`
          : `${mode}:${effectiveSeason}:${effectiveYear}:${page}`;
      const authBit = connected ? ':auth' : '';
      cacheKey = (sig ? `${base}:${sig}` : base) + authBit;
    }

    const result = await this.queryPagedMedia(description, BROWSE_MEDIA_QUERY, variables, cacheKey);
    return { ...result, media: result.media.map(m => this.withOnList(m, connected)) };
  }

  /**
   * Surface a flat `onList` boolean on a browse media item, derived from the
   * authed `mediaListEntry` selection. Left `undefined` when unauthed so the
   * renderer only badges "on your list" when it's explicitly `true`.
   */
  private withOnList(media: AniListMedia, connected: boolean): AniListMedia {
    if (!connected) return media;
    // Strip the raw `mediaListEntry` from the wire — the renderer's DiscoverMedia
    // contract only declares the flat `onList` boolean we derive from it.
    const { mediaListEntry, ...rest } = media;
    return { ...rest, onList: mediaListEntry != null };
  }

  /**
   * Execute a paged media query against AniList and extract media + pageInfo.
   * Centralizes the common log/try/query/extract/catch pattern.
   */
  private async queryPagedMedia(
    description: string,
    query: string,
    variables: Record<string, unknown>,
    cacheKey?: string
  ): Promise<PaginatedMediaResult> {
    const page = (variables.page as number) ?? 1;
    logger.debug(`${description} (page ${page})`);

    try {
      const data = cacheKey
        ? await this.anilistClient.cachedQuery<PaginatedMediaResponse>(cacheKey, query, variables)
        : await this.anilistClient.query<PaginatedMediaResponse>(query, variables);
      return {
        media: data.Page.media,
        pageInfo: data.Page.pageInfo,
      };
    } catch (error) {
      logger.error(`Failed: ${description}: ${extractErrorMessage(error)}`);
      throw error;
    }
  }
}
