/**
 * Anime Types - Core types for anime tracking and browsing
 */

export type AnimeStatus = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

export interface AnimeEntry {
  id: number;
  anilistId?: number;
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  coverImage?: string;
  episodes?: number;
  status: AnimeStatus;
  currentEpisode: number;
  score?: number;
  notes?: string;
  resumeUrl?: string;
  addedAt: string;
  updatedAt: string;
  /**
   * Epoch ms of the last successful AniList reconcile for this entry, or null if
   * it has never been synced. Derived from the main-side `anilist_synced_at`
   * baseline (a SQLite datetime string) — the raw baseline columns the
   * reconciler uses stay main-side; only this renderer-friendly timestamp
   * crosses the socket.
   */
  anilistSyncedAt?: number | null;
  /** Convenience flag: whether this entry has ever been synced with AniList. */
  synced?: boolean;
  /**
   * The MyAnimeList anime id this entry is linked to, or null if unlinked.
   * Backfilled from AniList `Media.idMal` (nullable, non-unique) or resolved via
   * MAL title search. Mirrors {@link anilistId} for the MAL provider.
   */
  malId?: number | null;
  /**
   * Epoch ms of the last successful MAL reconcile for this entry, or null if it
   * has never been synced with MAL. Derived from the main-side `mal_synced_at`
   * baseline (a SQLite datetime string) — mirrors {@link anilistSyncedAt}.
   */
  malSyncedAt?: number | null;
  /** Convenience flag: whether this entry has ever been synced with MAL. */
  malSynced?: boolean;
}

export interface AiringAnime {
  id: number;
  airingAt: number; // unix timestamp
  episode: number;
  media: {
    id: number;
    title: { romaji?: string; english?: string; native?: string };
    coverImage: { large?: string; medium?: string };
    episodes?: number;
    status: string;
    format?: string;
    genres: string[];
    averageScore?: number;
    popularity?: number;
  };
}

// ============================================
// Anime Detail Types (from AniList API)
// ============================================

export interface AnimeDetailFuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface AnimeDetailTrailer {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface AnimeDetailTag {
  id: number;
  name: string;
  rank?: number;
  isGeneralSpoiler?: boolean;
  isMediaSpoiler?: boolean;
}

export interface AnimeDetailCharacter {
  role: string;
  node: {
    id: number;
    name: { full?: string; userPreferred?: string };
    image: { medium?: string };
  };
}

export interface AnimeDetailStaff {
  role: string;
  node: {
    id: number;
    name: { full?: string; userPreferred?: string };
    image: { medium?: string };
  };
}

export interface AnimeDetailStudio {
  isMain: boolean;
  node: { id?: number; name: string; isAnimationStudio?: boolean };
}

export interface AnimeDetailRelation {
  relationType: string;
  node: {
    id: number;
    title: { romaji?: string; english?: string };
    format?: string;
    type?: string;
    status?: string;
    coverImage: { medium?: string };
    averageScore?: number;
  };
}

export interface AnimeDetailRecommendation {
  mediaRecommendation: {
    id: number;
    title: { romaji?: string };
    coverImage: { medium?: string };
    format?: string;
    averageScore?: number;
  };
}

export interface AnimeDetailExternalLink {
  url: string;
  site: string;
  type?: string;
  icon?: string;
  color?: string;
}

export interface AnimeDetailStreamingEpisode {
  title: string;
  thumbnail: string;
  url: string;
  site: string;
}

export interface AnimeDetailRanking {
  id: number;
  rank: number;
  type: string;
  format?: string;
  year?: number;
  season?: string;
  allTime?: boolean;
  context: string;
}

export interface AnimeDetail {
  id: number;
  idMal?: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { large?: string; extraLarge?: string; color?: string };
  bannerImage?: string;
  episodes?: number;
  duration?: number;
  status: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  source?: string;
  genres: string[];
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  isAdult?: boolean;
  siteUrl?: string;
  description?: string;
  startDate?: AnimeDetailFuzzyDate;
  endDate?: AnimeDetailFuzzyDate;
  trailer?: AnimeDetailTrailer;
  tags?: AnimeDetailTag[];
  nextAiringEpisode?: { airingAt: number; episode: number; timeUntilAiring?: number };
  studios?: { edges?: AnimeDetailStudio[] };
  staff?: { edges: AnimeDetailStaff[] };
  characters?: { edges: AnimeDetailCharacter[] };
  relations?: { edges: AnimeDetailRelation[] };
  recommendations?: { nodes: AnimeDetailRecommendation[] };
  externalLinks?: AnimeDetailExternalLink[];
  streamingEpisodes?: AnimeDetailStreamingEpisode[];
  rankings?: AnimeDetailRanking[];
  stats?: {
    scoreDistribution?: { score: number; amount: number }[];
    statusDistribution?: { status: string; amount: number }[];
  };
}

export interface BrowserLeafNode {
  kind: 'leaf';
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserSplitNode {
  kind: 'split';
  id: string;
  orientation: 'horizontal' | 'vertical';
  /** Fraction of the group occupied by `left`, in [0, 1]. */
  ratio: number;
  left: BrowserNode;
  right: BrowserNode;
}

export type BrowserNode = BrowserLeafNode | BrowserSplitNode;

/**
 * Legacy alias for the leaf shape. Kept so callers can migrate incrementally;
 * a `BrowserTab` value is structurally a leaf without the discriminator.
 */
export type BrowserTab = Omit<BrowserLeafNode, 'kind'>;

// ============================================
// Library Payloads
// ============================================

export interface LibraryAddPayload {
  anilistId?: number;
  /** Optional MyAnimeList id set at insert time — e.g. when importing from MAL. */
  malId?: number | null;
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  coverImage?: string;
  episodes?: number;
  status?: AnimeStatus;
  currentEpisode?: number;
  /** Optional rating (0–10) set at insert time — e.g. when importing from AniList. */
  score?: number;
  /** Optional free-text notes set at insert time — e.g. when importing from AniList. */
  notes?: string;
  resumeUrl?: string;
}

export interface LibraryUpdatePayload {
  id: number;
  anilistId?: number | null;
  status?: AnimeStatus;
  currentEpisode?: number;
  score?: number;
  notes?: string;
  resumeUrl?: string;
}

/**
 * Bulk-update payload: apply the SAME field change to every id in `ids` in one
 * request. Exposes only the fields meaningful (and safe) to set uniformly
 * across many rows — `status`, `score`, `currentEpisode`. Per-entry identity /
 * content fields (`anilistId`, `notes`, `resumeUrl`) stay on the single-row
 * {@link LibraryUpdatePayload}. Sent by the library batch action bar so a large
 * selection is one socket emit instead of N.
 */
export interface LibraryUpdateManyPayload {
  ids: number[];
  status?: AnimeStatus;
  currentEpisode?: number;
  score?: number;
}

/** Bulk-remove payload: delete every id in `ids` in one request/transaction. */
export interface LibraryRemoveManyPayload {
  ids: number[];
}

export interface LibraryStatsResult {
  watching: number;
  completed: number;
  plan_to_watch: number;
  on_hold: number;
  dropped: number;
  total: number;
}

// ============================================
// Notification Settings
// ============================================

export interface NotificationSubscription {
  anilistId: number;
  title: string;
  titleRomaji?: string;
  coverImage?: string;
  subscribedAt: string;
  enabled: boolean;
  source: 'schedule' | 'library';
  /** ISO 8601 timestamp, updated when anime appears in the weekly schedule */
  lastSeenAt?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  /** How many minutes before airing to fire the notification (0 = at airing time) */
  leadTimeMinutes: number;
  quietHours: {
    enabled: boolean;
    start: string; // "HH:mm"
    end: string; // "HH:mm"
  };
  useSystemSound: boolean;
  subscriptions: NotificationSubscription[];
}

// ============================================
// Discord Rich Presence Settings
// ============================================

export type DiscordActivityType =
  | 'watching'
  | 'browsing'
  | 'library'
  | 'diary'
  | 'schedule'
  | 'settings'
  | 'idle';

export interface DiscordPresenceTemplate {
  details: string;
  state: string;
  showTimestamp: boolean;
  showLargeImage: boolean;
  showButton: boolean;
}

export type DiscordPresenceTemplates = Record<DiscordActivityType, DiscordPresenceTemplate>;

export interface DiscordRpcSettings {
  enabled: boolean;
  /** Whether to show specific anime titles or generic "Using ShiroAni" */
  showAnimeDetails: boolean;
  /** Whether to show elapsed time on the presence */
  showElapsedTime: boolean;
  /** Whether to use custom templates instead of defaults */
  useCustomTemplates: boolean;
  /** Per-activity custom templates */
  templates: DiscordPresenceTemplates;
}

// ============================================
// Quick Access Types
// ============================================

export interface QuickAccessSite {
  id: string;
  name: string;
  url: string;
  icon?: string;
  isPredefined?: boolean;
}

export interface FrequentSite {
  url: string;
  title: string;
  favicon?: string;
  visitCount: number;
  lastVisited: number;
}

/**
 * A single chronological browsing-history entry. Distinct from `FrequentSite`,
 * which aggregates visits by URL — history preserves every visit in order so
 * the user can scan, search and selectively delete what they've seen.
 */
export interface BrowserHistoryEntry {
  /** Stable id so the UI can delete a single entry. */
  id: string;
  url: string;
  title: string;
  favicon?: string;
  /** Epoch millis of the visit. */
  visitedAt: number;
}

// ============================================
// User Profile Types
// ============================================

/** A favourited media (anime/manga) entry surfaced in a profile. */
export interface UserProfileFavouriteMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage?: string;
}

/** A favourited person (character/staff) entry surfaced in a profile. */
export interface UserProfileFavouritePerson {
  id: number;
  name: string;
  image?: string;
}

/** A favourited studio entry. Studios have no image on AniList. */
export interface UserProfileFavouriteStudio {
  id: number;
  name: string;
}

export interface UserProfile {
  id: number;
  name: string;
  avatar?: string;
  bannerImage?: string;
  about?: string;
  siteUrl?: string;
  createdAt?: number;
  statistics: {
    count: number;
    meanScore: number;
    standardDeviation: number;
    minutesWatched: number;
    episodesWatched: number;
    genres: Array<{ name: string; count: number; meanScore: number; minutesWatched: number }>;
    formats: Array<{ name: string; count: number; meanScore: number; minutesWatched: number }>;
    statuses: Array<{ name: string; count: number; meanScore: number; minutesWatched: number }>;
    scores: Array<{ score: number; count: number; meanScore: number }>;
    releaseYears: Array<{ year: number; count: number; meanScore: number }>;
    studios: Array<{ name: string; count: number; meanScore: number; minutesWatched: number }>;
    tags: Array<{ name: string; count: number; meanScore: number }>;
    /**
     * Richer statistics arrays — all OPTIONAL and additive. The public
     * username path and the authed viewer path both populate them where AniList
     * returns data; consumers must tolerate `undefined`.
     */
    voiceActors?: Array<{ name: string; count: number; meanScore: number; minutesWatched: number }>;
    staff?: Array<{ name: string; count: number; meanScore: number; minutesWatched: number }>;
    startYears?: Array<{ value: number; count: number; meanScore: number; minutesWatched: number }>;
    lengths?: Array<{ value: string; count: number; meanScore: number; minutesWatched: number }>;
    countries?: Array<{ value: string; count: number; meanScore: number; minutesWatched: number }>;
  };
  /** Favourite anime. Kept as-is for backward compatibility. */
  favourites: UserProfileFavouriteMedia[];
  /**
   * All-type favourites — OPTIONAL and additive. Populated from the public
   * profile and viewer queries where available.
   */
  favouritesManga?: UserProfileFavouriteMedia[];
  favouritesCharacters?: UserProfileFavouritePerson[];
  favouritesStaff?: UserProfileFavouritePerson[];
  favouritesStudios?: UserProfileFavouriteStudio[];
}

// ============================================
// AniList Activity Feed Types
// ============================================

/**
 * A single AniList activity-feed entry for the authenticated viewer.
 *
 * Discriminated on `type`:
 *  - `'list'`  — a list update (e.g. "watched episode 12 of …"). `status` and
 *    `progress` are AniList's textual strings (progress can be a range like
 *    "12 - 13"), `media` is the associated anime/manga.
 *  - `'text'`  — a free-text status post.
 *
 * AniList's ActivityUnion also includes MessageActivity, which is filtered out
 * by the mapper — only list/text entries ever reach the renderer.
 */
export type AniListActivity =
  | {
      type: 'list';
      id: number;
      status?: string;
      progress?: string;
      media: {
        id: number;
        title: { romaji?: string; english?: string; native?: string };
        coverImage?: string;
      };
      createdAt: number;
      /**
       * The activity's author. Populated only by the SOCIAL feed
       * ({@link AnimeEvents.GET_SOCIAL_FEED}), where activities come from people
       * the viewer follows; left `undefined` by the OWN-activity feed
       * ({@link AnimeEvents.GET_VIEWER_ACTIVITY}), which doesn't select it.
       */
      user?: AniListActivityUser;
    }
  | {
      type: 'text';
      id: number;
      text: string;
      createdAt: number;
      /** The activity's author — see the `list` variant's `user`. */
      user?: AniListActivityUser;
    };

/**
 * The author of a social-feed activity. A minimal subset of {@link AniListUser}
 * (no `isFollowing`/`siteUrl`) — just enough to render "who posted this".
 */
export interface AniListActivityUser {
  id: number;
  name: string;
  avatar?: string;
}

// ============================================
// AniList Social Graph (following / followers)
// ============================================

/**
 * A single AniList user surfaced in the viewer's following/followers lists.
 * `isFollowing` is whether the CONNECTED viewer follows this user (so the UI can
 * render a follow/unfollow toggle); `siteUrl` links out to the AniList profile.
 */
export interface AniListUser {
  id: number;
  name: string;
  avatar?: string;
  /** Whether the connected viewer currently follows this user. */
  isFollowing?: boolean;
  siteUrl?: string;
}

/**
 * Request for {@link AnimeEvents.GET_FOLLOWING}. Fetch the people a user follows.
 * `userId` defaults to the connected viewer's own id when omitted.
 */
export interface GetFollowingRequest {
  userId?: number;
}

/** Ack for {@link AnimeEvents.GET_FOLLOWING}. */
export interface GetFollowingResult {
  users: AniListUser[];
}

/**
 * Request for {@link AnimeEvents.GET_FOLLOWERS}. Fetch the people who follow a
 * user. `userId` defaults to the connected viewer's own id when omitted.
 */
export interface GetFollowersRequest {
  userId?: number;
}

/** Ack for {@link AnimeEvents.GET_FOLLOWERS}. */
export interface GetFollowersResult {
  users: AniListUser[];
}

/**
 * Request for {@link AnimeEvents.TOGGLE_FOLLOW}. Toggle the connected viewer's
 * follow state for `userId` (AniList's `ToggleFollow` flips the current state).
 */
export interface ToggleFollowRequest {
  userId: number;
}

/**
 * Ack for {@link AnimeEvents.TOGGLE_FOLLOW}. `isFollowing` is the NEW follow
 * state after the toggle, or `null` when not connected (caller can no-op).
 */
export interface ToggleFollowResult {
  isFollowing: boolean | null;
}

/** Ack for {@link AnimeEvents.GET_SOCIAL_FEED}. */
export interface GetSocialFeedResult {
  activities: AniListActivity[];
}

// ============================================
// AniList Notifications
// ============================================

/**
 * A minimal media reference attached to a notification (airing / related-media).
 * Subset of the discover/detail media shape — just enough to render a cover +
 * title in the notification row.
 */
export interface AniListNotificationMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage?: string;
}

/**
 * The other party in a social notification (the follower, or the user who
 * liked/replied/mentioned). Mirrors {@link AniListActivityUser}.
 */
export interface AniListNotificationUser {
  id: number;
  name: string;
  avatar?: string;
}

/**
 * A single AniList notification for the connected viewer.
 *
 * Discriminated on `type`:
 *  - `'airing'`        — a subscribed anime aired a new episode (`media`,
 *    `episode`).
 *  - `'following'`     — a user started following the viewer (`user`).
 *  - `'activity'`      — a user liked / replied to / mentioned the viewer in an
 *    activity. The differing flavour is carried by `context` (AniList's own
 *    phrasing, e.g. "liked your activity"); `activityId` links to the activity.
 *  - `'related-media'` — a new media related to one on the viewer's list was
 *    added (`media`).
 *
 * Every variant carries `id`, `createdAt` (epoch seconds) and a short `context`
 * string AniList supplies for display. AniList's `NotificationUnion` has more
 * members (thread/message/etc.); the mapper drops the ones we don't surface.
 */
export type AniListNotification =
  | {
      type: 'airing';
      id: number;
      context: string;
      createdAt: number;
      episode: number;
      media: AniListNotificationMedia;
    }
  | {
      type: 'following';
      id: number;
      context: string;
      createdAt: number;
      user: AniListNotificationUser;
    }
  | {
      type: 'activity';
      id: number;
      context: string;
      createdAt: number;
      /** The activity the notification points at (like/reply/mention target). */
      activityId: number;
      user: AniListNotificationUser;
    }
  | {
      type: 'related-media';
      id: number;
      context: string;
      createdAt: number;
      media: AniListNotificationMedia;
    };

/**
 * Ack for {@link AnimeEvents.GET_NOTIFICATIONS}. `unreadCount` is the viewer's
 * unread notification count (0 when not connected). `notifications` is newest
 * first; entries whose required `media`/`user` was deleted are dropped.
 */
export interface GetNotificationsResult {
  notifications: AniListNotification[];
  unreadCount: number;
}

/**
 * Ack for {@link AnimeEvents.MARK_NOTIFICATIONS_READ}. Always `{ unreadCount: 0 }`
 * — the call resets the count server-side (or no-ops when not connected).
 */
export interface MarkNotificationsReadResult {
  unreadCount: number;
}

// ============================================
// Discover (AniList browse) Types
// ============================================

/**
 * AniList media shape returned by the discover gateway handlers
 * (`anime:get-trending` / `-popular` / `-seasonal` / `-random`) and consumed by
 * the web discover store and grid. Cross-app contract — kept here so the store
 * and its consumers share one definition.
 */
export interface DiscoverMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { large?: string; medium?: string; extraLarge?: string; color?: string };
  bannerImage?: string;
  episodes?: number;
  status?: string;
  format?: string;
  genres?: string[];
  averageScore?: number;
  popularity?: number;
  season?: string;
  seasonYear?: number;
  nextAiringEpisode?: { airingAt: number; episode: number };
  description?: string;
  /**
   * Whether this media is on the connected viewer's AniList list. Derived
   * main-side from the authed `mediaListEntry` selection (`!= null`). `undefined`
   * when unauthed or the field couldn't be resolved — so the renderer only badges
   * "on your list" when this is explicitly `true`.
   */
  onList?: boolean;
}

// ============================================
// AniList list write-through (Discover -> AniList)
// ============================================

/**
 * AniList list-entry status enum (the write vocabulary for the SaveMediaListEntry
 * mutation). Mirrors AniList's `MediaListStatus`. Re-declared here (not imported
 * from the desktop types) so the shared contract stays self-contained.
 */
export type AniListListStatus =
  | 'CURRENT'
  | 'PLANNING'
  | 'COMPLETED'
  | 'DROPPED'
  | 'PAUSED'
  | 'REPEATING';

/**
 * Request for {@link AnimeEvents.SAVE_MEDIA_LIST_ENTRY}. Create or update the
 * viewer's AniList list entry for a media. Absent optional fields are NOT written
 * (AniList leaves the existing remote value untouched). `status` is the AniList
 * vocabulary (default PLANNING when omitted); `score` is the LOCAL 0–10 scale and
 * is converted to AniList's POINT_100 raw score main-side.
 */
export interface SaveMediaListEntryRequest {
  mediaId: number;
  status?: AniListListStatus;
  /** Episodes watched. */
  progress?: number;
  /** Local 0–10 score. Omit to leave the remote score unchanged. */
  score?: number;
  notes?: string;
}

/**
 * Ack for {@link AnimeEvents.SAVE_MEDIA_LIST_ENTRY}. `updatedAt` is the AniList
 * epoch-seconds timestamp the server stamped, or `null` when the viewer is not
 * connected (so the caller can no-op rather than treat it as an error).
 */
export interface SaveMediaListEntryResult {
  updatedAt: number | null;
}

// ============================================
// Community recommendations (AniList Page.recommendations)
// ============================================

/** The connected viewer's vote on a recommendation (AniList RecommendationRating). */
export type RecommendationRating = 'RATE_UP' | 'RATE_DOWN' | 'NO_RATING';

/**
 * A single community recommendation pairing: `media` (the source anime) was the
 * basis for recommending `mediaRecommendation`. `rating` is the net community
 * vote score; `userRating` is the connected viewer's own vote (NO_RATING when the
 * viewer hasn't voted or isn't connected).
 */
export interface AniListCommunityRecommendation {
  id: number;
  rating: number;
  userRating: RecommendationRating;
  media: {
    id: number;
    title: { romaji?: string; english?: string; native?: string };
    coverImage?: string;
    format?: string;
    averageScore?: number;
  };
  mediaRecommendation: {
    id: number;
    title: { romaji?: string; english?: string; native?: string };
    coverImage?: string;
    format?: string;
    averageScore?: number;
  };
}

/**
 * Request for {@link AnimeEvents.GET_RECOMMENDATIONS}. Browse community
 * recommendations sorted by rating. Optionally seed by a source `mediaId` to get
 * recommendations stemming from a specific anime.
 */
export interface GetRecommendationsRequest {
  mediaId?: number;
}

/** Ack for {@link AnimeEvents.GET_RECOMMENDATIONS}. */
export interface GetRecommendationsResult {
  recommendations: AniListCommunityRecommendation[];
}

/**
 * Request for {@link AnimeEvents.SAVE_RECOMMENDATION}. Vote on a recommendation
 * pairing. `RATE_UP`/`RATE_DOWN` cast a vote; `NO_RATING` clears it. Authed.
 */
export interface SaveRecommendationRequest {
  mediaId: number;
  mediaRecommendationId: number;
  rating: RecommendationRating;
}

/**
 * Ack for {@link AnimeEvents.SAVE_RECOMMENDATION}. `userRating` is the viewer's
 * resulting vote, or `null` when not connected.
 */
export interface SaveRecommendationResult {
  userRating: RecommendationRating | null;
}

// ============================================
// Discord Rich Presence Types
// ============================================

/** RPC connection lifecycle state, surfaced to the renderer for a status indicator. */
export type DiscordRpcStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface DiscordPresenceActivity {
  /** Current view/activity: browser, library, diary, schedule, settings */
  view: string;
  /** Optional anime title being viewed */
  animeTitle?: string;
  /** Optional anime cover image URL */
  animeCoverUrl?: string;
  /** Optional AniList anime ID for the button link */
  anilistId?: number;
  /** Total anime count in library (for library view) */
  libraryCount?: number;
  /** Episode number/info extracted from URL */
  episodeNumber?: string;
  /** Site hostname where anime is being watched */
  siteName?: string;
}
