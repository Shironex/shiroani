import { Injectable, Optional } from '@nestjs/common';
import {
  createLogger,
  extractErrorMessage,
  getCurrentAniListSeason,
  DISCOVER_SORT_TO_ANILIST,
  DISCOVER_SCORE_MIN,
  DISCOVER_SCORE_MAX,
  discoverFilterSignature,
} from '@shiroani/shared';
import type {
  UserProfile,
  AniListActivity,
  AniListActivityUser,
  AniListUser,
  AniListNotification,
  AniListNotificationMedia,
  AniListNotificationUser,
  GetNotificationsResult,
  DiscoverSort,
  DiscoverFilters,
  AniListCommunityRecommendation,
  SaveMediaListEntryRequest,
  SaveRecommendationRequest,
  RecommendationRating,
  MalUserStats,
} from '@shiroani/shared';
import { AniListClient } from './anilist-client';
import { MalClient } from './mal-client';
import {
  ANIME_DETAILS_QUERY,
  AIRING_SCHEDULE_QUERY,
  BROWSE_MEDIA_QUERY,
  RANDOM_BY_GENRE_QUERY,
  USER_PROFILE_QUERY,
  VIEWER_PROFILE_QUERY,
  VIEWER_ACTIVITY_QUERY,
  RECOMMENDATIONS_QUERY,
  SAVE_RECOMMENDATION_MUTATION,
  FOLLOWING_QUERY,
  FOLLOWERS_QUERY,
  TOGGLE_FOLLOW_MUTATION,
  SOCIAL_FEED_QUERY,
  NOTIFICATIONS_QUERY,
  MARK_NOTIFICATIONS_READ_QUERY,
} from './queries';
import type {
  AniListMedia,
  AniListPageInfo,
  AniListAiringSchedule,
  AniListActivityNode,
  AniListActivityUserNode,
  AniListFollowUserNode,
  AniListNotificationNode,
  AniListNotificationMediaNode,
  AniListNotificationUserNode,
  AniListRecommendationEntry,
  AniListRecommendationMedia,
  PaginatedMediaResponse,
  AnimeDetailsResponse,
  AiringScheduleResponse,
  UserProfileResponse,
  ViewerProfileResponse,
  ViewerActivityResponse,
  SocialFeedResponse,
  FollowingResponse,
  FollowersResponse,
  ToggleFollowResponse,
  NotificationsResponse,
  RecommendationsResponse,
  SaveRecommendationResponse,
} from './types';

/** Local 0–10 score → AniList raw POINT_100 score (0–100). Inlined to keep this
 * module independent of anilist-sync's reconcile.ts (mirrors localScoreToRaw). */
function localScoreToRaw(score: number): number {
  return Math.round(score * 10);
}

const logger = createLogger('AnimeService');

const DEFAULT_PER_PAGE = 20;

/** Cache lifetime for a fetched AniList user profile. */
const PROFILE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface PaginatedMediaResult {
  media: AniListMedia[];
  pageInfo: AniListPageInfo;
}

export interface PaginatedAiringResult {
  airingSchedules: AniListAiringSchedule[];
  pageInfo: AniListPageInfo;
}

@Injectable()
export class AnimeService {
  constructor(
    private readonly anilistClient: AniListClient,
    // Optional so the unit tests can construct the service with just the AniList
    // client; DI provides the real MalClient (same AnimeModule). Absent → the
    // MAL viewer-profile path resolves null (treated as "not connected").
    @Optional() private readonly malClient?: MalClient
  ) {
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
   * Fetch the connected viewer's recent AniList activity feed (list + text
   * activities, newest first). Resolves the viewer id via {@link
   * AniListClient.getViewer}, then pages the activity union. Returns [] when not
   * connected.
   */
  async getViewerActivity(): Promise<AniListActivity[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getViewerActivity: not connected, returning empty feed');
      return [];
    }

    logger.info('Fetching connected viewer AniList activity feed');
    try {
      const viewer = await this.anilistClient.getViewer();
      const data = await this.anilistClient.query<ViewerActivityResponse>(VIEWER_ACTIVITY_QUERY, {
        userId: viewer.id,
      });
      const nodes = data.Page?.activities ?? [];
      return nodes
        .map(node => this.mapActivity(node))
        .filter((a): a is AniListActivity => a !== null);
    } catch (error) {
      logger.error(`Failed to fetch viewer activity: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the people a user FOLLOWS. Resolves the target id via the optional
   * `userId` arg, falling back to the connected viewer's own id. Returns [] when
   * not connected (no token) so callers can render a "connect your account"
   * state. `isFollowing` on each entry reflects the connected viewer's own
   * follow state (drives the follow/unfollow toggle).
   */
  async getFollowing(userId?: number): Promise<AniListUser[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getFollowing: not connected, returning empty list');
      return [];
    }

    logger.info('Fetching AniList following list');
    try {
      const targetId = userId ?? (await this.anilistClient.getViewer()).id;
      const data = await this.anilistClient.query<FollowingResponse>(FOLLOWING_QUERY, {
        userId: targetId,
      });
      const nodes = data.Page?.following ?? [];
      return nodes
        .map(node => this.mapFollowUser(node))
        .filter((u): u is AniListUser => u !== null);
    } catch (error) {
      logger.error(`Failed to fetch following list: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the people who FOLLOW a user. Mirror of {@link getFollowing} via
   * `Page.followers`. Returns [] when not connected.
   */
  async getFollowers(userId?: number): Promise<AniListUser[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getFollowers: not connected, returning empty list');
      return [];
    }

    logger.info('Fetching AniList followers list');
    try {
      const targetId = userId ?? (await this.anilistClient.getViewer()).id;
      const data = await this.anilistClient.query<FollowersResponse>(FOLLOWERS_QUERY, {
        userId: targetId,
      });
      const nodes = data.Page?.followers ?? [];
      return nodes
        .map(node => this.mapFollowUser(node))
        .filter((u): u is AniListUser => u !== null);
    } catch (error) {
      logger.error(`Failed to fetch followers list: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Follow or unfollow an AniList user (AniList `ToggleFollow` flips the current
   * state). Returns the NEW follow state, or `null` when not connected so the
   * caller can no-op rather than surface an auth error. Authed.
   */
  async toggleFollow(userId: number): Promise<boolean | null> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('toggleFollow: not connected, returning null');
      return null;
    }

    logger.info(`Toggling follow state for AniList user ${userId}`);
    try {
      const data = await this.anilistClient.query<ToggleFollowResponse>(TOGGLE_FOLLOW_MUTATION, {
        userId,
      });
      return data.ToggleFollow?.isFollowing ?? false;
    } catch (error) {
      logger.error(`Failed to toggle follow for user ${userId}: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the social activity feed of the people the connected viewer FOLLOWS
   * (list + text activities, newest first). `activities(isFollowing: true)` is
   * token-relative, so this does NOT resolve or pass a `userId` (unlike
   * {@link getViewerActivity}) — it only guards on `hasToken`. Each activity
   * carries its author via `user`. Returns [] when not connected.
   */
  async getSocialFeed(): Promise<AniListActivity[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getSocialFeed: not connected, returning empty feed');
      return [];
    }

    logger.info('Fetching AniList social (following) activity feed');
    try {
      const data = await this.anilistClient.query<SocialFeedResponse>(SOCIAL_FEED_QUERY);
      const nodes = data.Page?.activities ?? [];
      return nodes
        .map(node => this.mapActivity(node))
        .filter((a): a is AniListActivity => a !== null);
    } catch (error) {
      logger.error(`Failed to fetch social feed: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the connected viewer's notifications (airing / following / activity
   * like-reply-mention / related-media), newest first, plus the unread count for
   * the badge. A single query selects both `Viewer.unreadNotificationCount` and
   * `Page.notifications` (read-only — `resetNotificationCount: false`). Returns
   * `{ notifications: [], unreadCount: 0 }` when not connected. Entries whose
   * required media/user was deleted, and unhandled union members, are dropped.
   */
  async getNotifications(): Promise<GetNotificationsResult> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getNotifications: not connected, returning empty result');
      return { notifications: [], unreadCount: 0 };
    }

    logger.info('Fetching connected viewer AniList notifications');
    try {
      const data = await this.anilistClient.query<NotificationsResponse>(NOTIFICATIONS_QUERY);
      const nodes = data.Page?.notifications ?? [];
      const notifications = nodes
        .map(node => this.mapNotification(node))
        .filter((n): n is AniListNotification => n !== null);
      const unreadCount = data.Viewer?.unreadNotificationCount ?? 0;
      return { notifications, unreadCount };
    } catch (error) {
      logger.error(`Failed to fetch notifications: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Clear the connected viewer's unread notification count. AniList resets the
   * count as a side-effect of `notifications(resetNotificationCount: true)`, so
   * this fires that minimal query and discards the payload. Returns `0` (the new
   * unread count) — also `0` when not connected (a no-op, no query). Authed.
   */
  async markNotificationsRead(): Promise<number> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('markNotificationsRead: not connected, no-op');
      return 0;
    }

    logger.info('Clearing AniList unread notification count');
    try {
      await this.anilistClient.query(MARK_NOTIFICATIONS_READ_QUERY);
      return 0;
    } catch (error) {
      logger.error(`Failed to mark notifications read: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Map a single raw notification node to the shared {@link AniListNotification}
   * union, switching on `__typename`. Returns null for union members we don't
   * surface, or a variant whose required `media`/`user` was deleted, so the caller
   * can filter them out. The four activity-* AniList types collapse into one
   * `'activity'` variant (their `context` string carries the like/reply/mention
   * distinction). `createdAt` defaults to 0 when AniList omits it.
   */
  private mapNotification(node: AniListNotificationNode | null): AniListNotification | null {
    if (!node) return null;

    const createdAt = node.createdAt ?? 0;

    switch (node.__typename) {
      case 'AiringNotification': {
        const media = this.mapNotificationMedia(node.media);
        if (!media) return null;
        return {
          type: 'airing',
          id: node.id,
          context: this.joinAiringContext(node.contexts, node.episode, media),
          createdAt,
          episode: node.episode ?? 0,
          media,
        };
      }

      case 'FollowingNotification': {
        const user = this.mapNotificationUser(node.user);
        if (!user) return null;
        return {
          type: 'following',
          id: node.id,
          context: node.context ?? '',
          createdAt,
          user,
        };
      }

      case 'ActivityLikeNotification':
      case 'ActivityReplyNotification':
      case 'ActivityMentionNotification': {
        const user = this.mapNotificationUser(node.user);
        if (!user) return null;
        return {
          type: 'activity',
          id: node.id,
          context: node.context ?? '',
          createdAt,
          activityId: node.activityId ?? 0,
          user,
        };
      }

      case 'RelatedMediaAdditionNotification': {
        const media = this.mapNotificationMedia(node.media);
        if (!media) return null;
        return {
          type: 'related-media',
          id: node.id,
          context: node.context ?? '',
          createdAt,
          media,
        };
      }

      default:
        return null;
    }
  }

  /**
   * Build a single display context for an airing notification. AniList ships the
   * phrasing split into a `contexts` array (e.g. ["Episode ", " of ", " aired."])
   * meant to wrap the episode number and title; we interleave them into one
   * string. Falls back to a sensible default when `contexts` is absent.
   */
  private joinAiringContext(
    contexts: Array<string | null> | null | undefined,
    episode: number | null | undefined,
    media: AniListNotificationMedia
  ): string {
    const title = media.title.romaji ?? media.title.english ?? media.title.native ?? 'Unknown';
    const parts = (contexts ?? []).filter((c): c is string => c != null);
    if (parts.length >= 3) {
      // ["Episode ", " of ", " aired."] → "Episode 12 of <title> aired."
      return `${parts[0]}${episode ?? ''}${parts[1]}${title}${parts.slice(2).join('')}`;
    }
    if (parts.length > 0) {
      return parts.join('');
    }
    return `Episode ${episode ?? ''} of ${title} aired.`.replace('  ', ' ');
  }

  /** Map a raw notification media node to the shared flat shape (null when absent). */
  private mapNotificationMedia(
    media: AniListNotificationMediaNode | null | undefined
  ): AniListNotificationMedia | null {
    if (!media) return null;
    return {
      id: media.id,
      title: {
        romaji: media.title?.romaji ?? undefined,
        english: media.title?.english ?? undefined,
        native: media.title?.native ?? undefined,
      },
      coverImage: media.coverImage?.large ?? media.coverImage?.medium,
    };
  }

  /** Map a raw notification user node to the shared shape (null when absent). */
  private mapNotificationUser(
    user: AniListNotificationUserNode | null | undefined
  ): AniListNotificationUser | null {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar?.large ?? user.avatar?.medium ?? undefined,
    };
  }

  /**
   * Map a single raw activity node to the shared {@link AniListActivity} union.
   * Returns null for entries we don't surface (MessageActivity, or a ListActivity
   * whose media was deleted) so the caller can filter them out. Shared by the OWN
   * viewer feed (no `user` selected → left undefined) and the SOCIAL feed (each
   * entry carries its author via `user`).
   */
  private mapActivity(node: AniListActivityNode | null): AniListActivity | null {
    if (!node) return null;

    if (node.__typename === 'ListActivity') {
      const media = node.media;
      if (!media) return null;
      return {
        type: 'list',
        id: node.id,
        status: node.status ?? undefined,
        progress: node.progress ?? undefined,
        media: {
          id: media.id,
          title: {
            romaji: media.title?.romaji ?? undefined,
            english: media.title?.english ?? undefined,
            native: media.title?.native ?? undefined,
          },
          coverImage: media.coverImage?.large ?? media.coverImage?.medium,
        },
        createdAt: node.createdAt,
        user: this.mapActivityUser(node.user),
      };
    }

    if (node.__typename === 'TextActivity') {
      return {
        type: 'text',
        id: node.id,
        text: node.text ?? '',
        createdAt: node.createdAt,
        user: this.mapActivityUser(node.user),
      };
    }

    return null;
  }

  /**
   * Map a raw activity author node to the shared {@link AniListActivityUser}.
   * Returns `undefined` when the node is absent — the own-viewer feed doesn't
   * select `user`, so list/text activities from there stay author-less.
   */
  private mapActivityUser(
    node: AniListActivityUserNode | null | undefined
  ): AniListActivityUser | undefined {
    if (!node) return undefined;
    return {
      id: node.id,
      name: node.name,
      avatar: node.avatar?.large ?? node.avatar?.medium ?? undefined,
    };
  }

  /**
   * Map a raw following/followers user node to the shared {@link AniListUser}.
   * Returns null when the node is absent (deleted/unresolvable account) so the
   * caller can filter it out.
   */
  private mapFollowUser(node: AniListFollowUserNode | null): AniListUser | null {
    if (!node) return null;
    return {
      id: node.id,
      name: node.name,
      avatar: node.avatar?.large ?? node.avatar?.medium ?? undefined,
      isFollowing: node.isFollowing ?? undefined,
      siteUrl: node.siteUrl ?? undefined,
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
   * Browse community recommendations (item C5), optionally seeded by a source
   * `mediaId`. Sorted by net community vote. `userRating` reflects the connected
   * viewer's own vote (NO_RATING when unauthed — the selection does not error
   * unauthenticated, so this works for everyone). Entries whose source or
   * recommended media was deleted are skipped.
   */
  async getRecommendations(mediaId?: number): Promise<AniListCommunityRecommendation[]> {
    logger.info(
      mediaId
        ? `Fetching community recommendations seeded by media ${mediaId}`
        : 'Fetching community recommendations'
    );
    try {
      const data = await this.anilistClient.query<RecommendationsResponse>(RECOMMENDATIONS_QUERY, {
        perPage: 30,
        mediaId,
      });
      const nodes = data.Page?.recommendations ?? [];
      return nodes
        .map(node => this.mapRecommendation(node))
        .filter((r): r is AniListCommunityRecommendation => r !== null);
    } catch (error) {
      logger.error(`Failed to fetch community recommendations: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Vote on a community recommendation (item C4). Casts (RATE_UP/RATE_DOWN) or
   * clears (NO_RATING) the connected viewer's vote on a (media,
   * mediaRecommendation) pairing. Authed — returns `null` when not connected so
   * the caller can no-op rather than surface an auth error; otherwise returns the
   * resulting `userRating`.
   */
  async saveRecommendation(input: SaveRecommendationRequest): Promise<RecommendationRating | null> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('saveRecommendation: not connected, returning null');
      return null;
    }

    logger.info(
      `Voting ${input.rating} on recommendation ${input.mediaId} -> ${input.mediaRecommendationId}`
    );
    try {
      const data = await this.anilistClient.query<SaveRecommendationResponse>(
        SAVE_RECOMMENDATION_MUTATION,
        {
          mediaId: input.mediaId,
          mediaRecommendationId: input.mediaRecommendationId,
          rating: input.rating,
        }
      );
      return data.SaveRecommendation?.userRating ?? 'NO_RATING';
    } catch (error) {
      logger.error(`Failed to save recommendation vote: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Map a raw `Page.recommendations` node to the shared
   * {@link AniListCommunityRecommendation}. Returns null when either side's media
   * was deleted (can't render a pairing with a missing anime).
   */
  private mapRecommendation(
    node: AniListRecommendationEntry | null
  ): AniListCommunityRecommendation | null {
    if (!node) return null;
    const media = this.mapRecommendationMedia(node.media);
    const mediaRecommendation = this.mapRecommendationMedia(node.mediaRecommendation);
    if (!media || !mediaRecommendation) return null;
    return {
      id: node.id,
      rating: node.rating ?? 0,
      userRating: node.userRating ?? 'NO_RATING',
      media,
      mediaRecommendation,
    };
  }

  /** Map a recommendation media node to the shared flat shape (null when absent). */
  private mapRecommendationMedia(
    media: AniListRecommendationMedia | null
  ): AniListCommunityRecommendation['media'] | null {
    if (!media) return null;
    return {
      id: media.id,
      title: {
        romaji: media.title?.romaji ?? undefined,
        english: media.title?.english ?? undefined,
        native: media.title?.native ?? undefined,
      },
      coverImage: media.coverImage?.large ?? media.coverImage?.medium,
      format: media.format ?? undefined,
      averageScore: media.averageScore ?? undefined,
    };
  }
}
