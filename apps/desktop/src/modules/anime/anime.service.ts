import { Injectable } from '@nestjs/common';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import type { UserProfile } from '@shiroani/shared';
import { AniListClient } from './anilist-client';
import {
  SEARCH_ANIME_QUERY,
  SEARCH_BY_TITLE_QUERY,
  ANIME_DETAILS_QUERY,
  AIRING_SCHEDULE_QUERY,
  TRENDING_ANIME_QUERY,
  POPULAR_THIS_SEASON_QUERY,
  RANDOM_BY_GENRE_QUERY,
  USER_PROFILE_QUERY,
} from './queries';
import type {
  AniListMedia,
  AniListPageInfo,
  AniListAiringSchedule,
  MediaSeason,
  SearchAnimeResponse,
  AnimeDetailsResponse,
  AiringScheduleResponse,
  TrendingAnimeResponse,
  PopularThisSeasonResponse,
  UserProfileResponse,
} from './types';

const logger = createLogger('AnimeService');

const DEFAULT_PER_PAGE = 20;

export interface PaginatedMediaResult {
  media: AniListMedia[];
  pageInfo: AniListPageInfo;
}

export interface TitleSearchResult {
  anilistId: number;
  idMal: number | undefined;
  title: { romaji?: string; english?: string; native?: string };
}

export interface PaginatedAiringResult {
  airingSchedules: AniListAiringSchedule[];
  pageInfo: AniListPageInfo;
}

@Injectable()
export class AnimeService {
  constructor(private readonly anilistClient: AniListClient) {
    logger.info('AnimeService initialized');
  }

  /**
   * Search anime by title with pagination.
   */
  async searchAnime(
    query: string,
    page = 1,
    perPage = DEFAULT_PER_PAGE
  ): Promise<PaginatedMediaResult> {
    return this.queryPagedMedia('Searching anime', SEARCH_ANIME_QUERY, {
      search: query,
      page,
      perPage,
    });
  }

  /**
   * Search anime by title and return minimal results including MAL ID.
   * Used by the OP/ED skip resolver to map an anime title to a MAL ID.
   */
  async searchByTitle(title: string, perPage = 5): Promise<TitleSearchResult[]> {
    logger.debug(`searchByTitle: "${title}"`);
    type Response = { Page: { media: AniListMedia[] } };
    try {
      const cacheKey = `search-by-title:${title.toLowerCase()}`;
      const data = await this.anilistClient.cachedQuery<Response>(cacheKey, SEARCH_BY_TITLE_QUERY, {
        search: title,
        perPage,
      });
      return (data.Page.media ?? []).map(m => ({
        anilistId: m.id,
        idMal: m.idMal,
        title: m.title,
      }));
    } catch (error) {
      logger.error(`searchByTitle failed for "${title}": ${extractErrorMessage(error)}`);
      throw error;
    }
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
   * Get currently trending anime with pagination.
   */
  async getTrending(page = 1, perPage = DEFAULT_PER_PAGE): Promise<PaginatedMediaResult> {
    return this.queryPagedMedia(
      'Fetching trending anime',
      TRENDING_ANIME_QUERY,
      {
        page,
        perPage,
      },
      `trending:${page}`
    );
  }

  /**
   * Get popular anime for the current season.
   * Automatically detects the current season and year.
   */
  async getPopularThisSeason(page = 1, perPage = DEFAULT_PER_PAGE): Promise<PaginatedMediaResult> {
    const season = getCurrentSeason();
    const seasonYear = new Date().getFullYear();

    return this.queryPagedMedia(
      `Fetching popular anime for ${season} ${seasonYear}`,
      POPULAR_THIS_SEASON_QUERY,
      { season, seasonYear, page, perPage },
      `popular:${season}:${seasonYear}:${page}`
    );
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
      const required = includedGenres;
      const matchesAll = (m: AniListMedia) => required.every(g => (m.genres ?? []).includes(g));
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
    perPage = DEFAULT_PER_PAGE
  ): Promise<PaginatedMediaResult> {
    return this.queryPagedMedia(
      `Fetching seasonal anime for ${season} ${year}`,
      POPULAR_THIS_SEASON_QUERY,
      { season: season.toUpperCase(), seasonYear: year, page, perPage },
      `seasonal:${season.toUpperCase()}:${year}:${page}`
    );
  }

  /**
   * Get a user's public AniList profile and statistics by username.
   */
  async getUserProfile(username: string): Promise<UserProfile> {
    logger.info(`Fetching AniList profile for "${username}"`);

    const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

    try {
      const cacheKey = `user-profile:${username.toLowerCase()}`;
      const data = await this.anilistClient.cachedQuery<UserProfileResponse>(
        cacheKey,
        USER_PROFILE_QUERY,
        { name: username },
        PROFILE_CACHE_TTL_MS
      );

      return this.mapUserProfile(data.User);
    } catch (error) {
      logger.error(`Failed to fetch profile for "${username}": ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Map the raw AniList user profile response to the shared UserProfile type.
   */
  private mapUserProfile(user: UserProfileResponse['User']): UserProfile {
    const stats = user.statistics?.anime;
    const favouriteNodes = user.favourites?.anime?.nodes ?? [];

    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar?.large ?? user.avatar?.medium,
      bannerImage: user.bannerImage ?? undefined,
      about: user.about ?? undefined,
      siteUrl: user.siteUrl ?? undefined,
      createdAt: user.createdAt ?? undefined,
      statistics: {
        count: stats?.count ?? 0,
        meanScore: stats?.meanScore ?? 0,
        standardDeviation: stats?.standardDeviation ?? 0,
        minutesWatched: stats?.minutesWatched ?? 0,
        episodesWatched: stats?.episodesWatched ?? 0,
        genres: (stats?.genres ?? []).map(g => ({
          name: g.genre,
          count: g.count,
          meanScore: g.meanScore,
          minutesWatched: g.minutesWatched ?? 0,
        })),
        formats: (stats?.formats ?? []).map(f => ({
          name: f.format,
          count: f.count,
          meanScore: f.meanScore,
          minutesWatched: f.minutesWatched ?? 0,
        })),
        statuses: (stats?.statuses ?? []).map(s => ({
          name: s.status,
          count: s.count,
          meanScore: s.meanScore,
          minutesWatched: s.minutesWatched ?? 0,
        })),
        scores: (stats?.scores ?? []).map(s => ({
          score: s.score,
          count: s.count,
          meanScore: s.meanScore,
        })),
        releaseYears: (stats?.releaseYears ?? []).map(r => ({
          year: r.releaseYear,
          count: r.count,
          meanScore: r.meanScore,
        })),
        studios: (stats?.studios ?? []).map(s => ({
          name: s.studio.name,
          count: s.count,
          meanScore: s.meanScore,
          minutesWatched: s.minutesWatched ?? 0,
        })),
        tags: (stats?.tags ?? []).map(t => ({
          name: t.tag.name,
          count: t.count,
          meanScore: t.meanScore,
        })),
      },
      favourites: favouriteNodes.map(f => ({
        id: f.id,
        title: {
          romaji: f.title.romaji ?? undefined,
          english: f.title.english ?? undefined,
          native: f.title.native ?? undefined,
        },
        coverImage: f.coverImage.large ?? f.coverImage.medium,
      })),
    };
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

    type PagedResponse = TrendingAnimeResponse | PopularThisSeasonResponse | SearchAnimeResponse;

    try {
      const data = cacheKey
        ? await this.anilistClient.cachedQuery<PagedResponse>(cacheKey, query, variables)
        : await this.anilistClient.query<PagedResponse>(query, variables);
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

/**
 * Determine the current anime season based on the current month.
 *
 * - WINTER: January, February, March
 * - SPRING: April, May, June
 * - SUMMER: July, August, September
 * - FALL: October, November, December
 */
function getCurrentSeason(): MediaSeason {
  const month = new Date().getMonth(); // 0-indexed
  if (month <= 2) return 'WINTER';
  if (month <= 5) return 'SPRING';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
}
