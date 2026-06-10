import { Injectable, Optional } from '@nestjs/common';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import type { UserProfile, MalUserStats } from '@shiroani/shared';
import { AniListClient } from './anilist-client';
import { MalClient } from './mal-client';
import { USER_PROFILE_QUERY, VIEWER_PROFILE_QUERY } from './queries';
import type { UserProfileResponse, ViewerProfileResponse } from './types';

const logger = createLogger('AnimeProfileService');

/** Cache lifetime for a fetched AniList user profile. */
const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * AniList + MAL user-profile reads: the public username lookup, the connected
 * viewer's own profile, and the thin MAL viewer stats. Extracted from
 * AnimeService so the discover/browse core doesn't carry the ~400-line profile
 * mapping surface.
 */
@Injectable()
export class AnimeProfileService {
  constructor(
    private readonly anilistClient: AniListClient,
    // Optional so the unit tests can construct the service with just the AniList
    // client; DI provides the real MalClient (same AnimeModule). Absent → the
    // MAL viewer-profile path resolves null (treated as "not connected").
    @Optional() private readonly malClient?: MalClient
  ) {
    logger.info('AnimeProfileService initialized');
  }

  /**
   * Get a user's public AniList profile and statistics by username.
   */
  async getUserProfile(username: string): Promise<UserProfile> {
    logger.info(`Fetching AniList profile for "${username}"`);

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
   * Fetch the connected viewer's OWN AniList profile (incl. private statistics).
   * Runs authed via {@link AniListClient.query} — the token never leaves the main
   * process. Returns null when not connected (no token), so callers can render a
   * "connect your account" state instead of surfacing an auth error. NOT cached,
   * so it always reflects fresh sync state.
   */
  async getViewerProfile(): Promise<UserProfile | null> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getViewerProfile: not connected, returning null');
      return null;
    }

    logger.info('Fetching connected viewer AniList profile');
    try {
      const data = await this.anilistClient.query<ViewerProfileResponse>(VIEWER_PROFILE_QUERY);
      return this.mapUserProfile(data.Viewer);
    } catch (error) {
      logger.error(`Failed to fetch viewer profile: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the connected MAL viewer's THIN profile — the viewer identity plus the
   * 15-scalar `anime_statistics`, flat on one {@link MalUserStats}. Returns null
   * when no MAL account is connected (no token, or the MAL client isn't wired),
   * so callers can render a "connect" state instead of surfacing an auth error.
   *
   * NOT AniList-parity: MAL's v2 API only exposes these scalars for `@me`, so
   * there are no genre/format breakdowns, no favourites, and no other-user
   * lookup. The raw blob is mapped 1:1 (each field coerced to a number,
   * defaulting to 0 when MAL omits it).
   */
  async getMalViewerProfile(): Promise<MalUserStats | null> {
    if (!this.malClient) {
      logger.debug('getMalViewerProfile: MAL client not wired, returning null');
      return null;
    }

    const viewer = await this.malClient.getViewer();
    if (!viewer) {
      logger.debug('getMalViewerProfile: not connected, returning null');
      return null;
    }

    return this.mapMalUserStats(
      { id: viewer.id, name: viewer.name, avatar: viewer.avatar },
      viewer.animeStatistics
    );
  }

  /**
   * Map the raw MAL `anime_statistics` blob (plus the resolved viewer) to the
   * typed {@link MalUserStats}. Each of the 15 scalars is coerced to a finite
   * number, defaulting to 0 when MAL omits it or returns a non-numeric value (a
   * brand-new account reports a partial blob).
   */
  private mapMalUserStats(
    viewer: MalUserStats['viewer'],
    raw: Record<string, unknown> | undefined
  ): MalUserStats {
    const num = (key: string): number => {
      const value = raw?.[key];
      const n = typeof value === 'string' ? Number(value) : value;
      return typeof n === 'number' && Number.isFinite(n) ? n : 0;
    };

    return {
      viewer,
      num_items_watching: num('num_items_watching'),
      num_items_completed: num('num_items_completed'),
      num_items_on_hold: num('num_items_on_hold'),
      num_items_dropped: num('num_items_dropped'),
      num_items_plan_to_watch: num('num_items_plan_to_watch'),
      num_items: num('num_items'),
      num_days_watched: num('num_days_watched'),
      num_days_watching: num('num_days_watching'),
      num_days_completed: num('num_days_completed'),
      num_days_on_hold: num('num_days_on_hold'),
      num_days_dropped: num('num_days_dropped'),
      num_days: num('num_days'),
      num_episodes: num('num_episodes'),
      num_times_rewatched: num('num_times_rewatched'),
      mean_score: num('mean_score'),
    };
  }

  /**
   * Map the raw AniList user profile response to the shared UserProfile type.
   * Shared by the public-username path and the authenticated viewer path, since
   * `User` and `Viewer` are structurally identical.
   */
  private mapUserProfile(user: UserProfileResponse['User']): UserProfile {
    const stats = user.statistics?.anime;
    const favourites = user.favourites;
    const favouriteNodes = favourites?.anime?.nodes ?? [];

    const mapMediaFav = (f: {
      id: number;
      title?: { romaji?: string; english?: string; native?: string } | null;
      coverImage?: { large?: string; medium?: string } | null;
    }) => ({
      id: f.id,
      title: {
        romaji: f.title?.romaji ?? undefined,
        english: f.title?.english ?? undefined,
        native: f.title?.native ?? undefined,
      },
      coverImage: f.coverImage?.large ?? f.coverImage?.medium,
    });

    const mapPersonFav = (p: {
      id: number;
      name?: { full?: string; userPreferred?: string };
      image?: { large?: string; medium?: string };
    }) => ({
      id: p.id,
      name: p.name?.full ?? p.name?.userPreferred ?? 'Unknown',
      image: p.image?.large ?? p.image?.medium,
    });

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
        voiceActors: (stats?.voiceActors ?? []).map(v => ({
          name: v.voiceActor?.name?.full ?? v.voiceActor?.name?.userPreferred ?? 'Unknown',
          count: v.count,
          meanScore: v.meanScore,
          minutesWatched: v.minutesWatched ?? 0,
        })),
        staff: (stats?.staff ?? []).map(s => ({
          name: s.staff?.name?.full ?? s.staff?.name?.userPreferred ?? 'Unknown',
          count: s.count,
          meanScore: s.meanScore,
          minutesWatched: s.minutesWatched ?? 0,
        })),
        startYears: (stats?.startYears ?? []).map(s => ({
          value: s.startYear,
          count: s.count,
          meanScore: s.meanScore,
          minutesWatched: s.minutesWatched ?? 0,
        })),
        lengths: (stats?.lengths ?? [])
          .filter((l): l is typeof l & { length: string } => l.length != null)
          .map(l => ({
            value: l.length,
            count: l.count,
            meanScore: l.meanScore,
            minutesWatched: l.minutesWatched ?? 0,
          })),
        countries: (stats?.countries ?? [])
          .filter((c): c is typeof c & { country: string } => c.country != null)
          .map(c => ({
            value: c.country,
            count: c.count,
            meanScore: c.meanScore,
            minutesWatched: c.minutesWatched ?? 0,
          })),
      },
      favourites: favouriteNodes.map(mapMediaFav),
      favouritesManga: (favourites?.manga?.nodes ?? []).map(mapMediaFav),
      favouritesCharacters: (favourites?.characters?.nodes ?? []).map(mapPersonFav),
      favouritesStaff: (favourites?.staff?.nodes ?? []).map(mapPersonFav),
      favouritesStudios: (favourites?.studios?.nodes ?? []).map(s => ({
        id: s.id,
        name: s.name,
      })),
    };
  }
}
