/**
 * AniList GraphQL API Response Types
 *
 * These types mirror the shape of AniList API responses
 * for use in the AnimeService and AniListClient.
 */

// ============================================
// Core Media Types
// ============================================

export interface AniListMediaTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface AniListCoverImage {
  large?: string;
  medium?: string;
  extraLarge?: string;
  color?: string;
}

export interface AniListFuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface AniListTrailer {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface AniListTag {
  id: number;
  name: string;
  rank?: number;
  isGeneralSpoiler?: boolean;
  isMediaSpoiler?: boolean;
}

export interface AniListCharacter {
  id: number;
  name: { full?: string; userPreferred?: string };
  image: { medium?: string };
}

export interface AniListCharacterEdge {
  role: string;
  node: AniListCharacter;
}

export interface AniListStaffMember {
  id: number;
  name: { full?: string; userPreferred?: string };
  image: { medium?: string };
}

export interface AniListStaffEdge {
  role: string;
  node: AniListStaffMember;
}

export interface AniListStudioEdge {
  isMain: boolean;
  node: AniListStudio;
}

export interface AniListRanking {
  id: number;
  rank: number;
  type: string;
  format?: string;
  year?: number;
  season?: string;
  allTime?: boolean;
  context: string;
}

export interface AniListScoreDistribution {
  score: number;
  amount: number;
}

export interface AniListStatusDistribution {
  status: string;
  amount: number;
}

export interface AniListMediaStats {
  scoreDistribution?: AniListScoreDistribution[];
  statusDistribution?: AniListStatusDistribution[];
}

export interface AniListNextAiringEpisode {
  airingAt: number;
  episode: number;
  timeUntilAiring?: number;
}

export interface AniListStudio {
  id?: number;
  name: string;
  isAnimationStudio?: boolean;
}

export interface AniListExternalLink {
  url: string;
  site: string;
  type?: string;
  icon?: string;
  color?: string;
}

export interface AniListStreamingEpisode {
  title: string;
  thumbnail: string;
  url: string;
  site: string;
}

/** Minimal media reference used in relations and recommendations */
export interface AniListMediaBasic {
  id: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
  format?: string;
  type?: string;
  status?: string;
  averageScore?: number;
}

export interface AniListRelationEdge {
  relationType: string;
  node: AniListMediaBasic;
}

export interface AniListRecommendationNode {
  mediaRecommendation: AniListMediaBasic;
}

/** Full media object returned by AniList */
export interface AniListMedia {
  id: number;
  idMal?: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
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
  startDate?: AniListFuzzyDate;
  endDate?: AniListFuzzyDate;
  trailer?: AniListTrailer;
  tags?: AniListTag[];
  nextAiringEpisode?: AniListNextAiringEpisode;
  studios?: { edges?: AniListStudioEdge[]; nodes?: AniListStudio[] };
  staff?: { edges: AniListStaffEdge[] };
  characters?: { edges: AniListCharacterEdge[] };
  relations?: { edges: AniListRelationEdge[] };
  recommendations?: { nodes: AniListRecommendationNode[] };
  externalLinks?: AniListExternalLink[];
  streamingEpisodes?: AniListStreamingEpisode[];
  rankings?: AniListRanking[];
  stats?: AniListMediaStats;
  /**
   * The connected viewer's list entry for this media (browse/discover only).
   * `null` when the media is not on the viewer's list OR the viewer is unauthed.
   * Used to derive the `onList` flag surfaced to the renderer.
   */
  mediaListEntry?: { status: AniListMediaListStatus | null } | null;
  /**
   * Flat "on the viewer's AniList list" flag, derived main-side from
   * `mediaListEntry != null` when authed. Left `undefined` when unauthed so the
   * renderer only badges "on your list" when this is explicitly `true`. Mirrors
   * the shared `DiscoverMedia.onList` so browse results map straight to the wire.
   */
  onList?: boolean;
}

// ============================================
// Pagination
// ============================================

export interface AniListPageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

// ============================================
// Airing Schedule
// ============================================

export interface AniListAiringSchedule {
  id: number;
  airingAt: number;
  episode: number;
  media: AniListMedia;
}

// ============================================
// GraphQL Response Shapes
// ============================================

/** Shared shape for paginated media queries (search, trending, popular, etc.) */
export type PaginatedMediaResponse = {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
};

export type SearchAnimeResponse = PaginatedMediaResponse;

export interface AnimeDetailsResponse {
  Media: AniListMedia;
}

export interface AiringScheduleResponse {
  Page: {
    pageInfo: AniListPageInfo;
    airingSchedules: AniListAiringSchedule[];
  };
}

export type TrendingAnimeResponse = PaginatedMediaResponse;

export type PopularThisSeasonResponse = PaginatedMediaResponse;

// ============================================
// Media Season
// ============================================

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

// ============================================
// User Profile Types
// ============================================

/** Generic distribution entry used across genre/format/status/studio/tag statistics */
export interface AniListStatDistribution {
  count: number;
  meanScore: number;
  minutesWatched?: number;
}

/** A person (Staff) node returned inside voiceActors/staff statistics + favourites. */
export interface AniListPersonNode {
  id: number;
  name?: { full?: string; userPreferred?: string };
  image?: { large?: string; medium?: string };
}

export interface AniListUserStatistics {
  count: number;
  meanScore: number;
  standardDeviation: number;
  minutesWatched: number;
  episodesWatched: number;
  genres: Array<AniListStatDistribution & { genre: string }>;
  formats: Array<AniListStatDistribution & { format: string }>;
  statuses: Array<AniListStatDistribution & { status: string }>;
  scores: Array<{ score: number; count: number; meanScore: number }>;
  releaseYears: Array<{ releaseYear: number; count: number; meanScore: number }>;
  studios: Array<AniListStatDistribution & { studio: { name: string } }>;
  tags: Array<{ tag: { name: string }; count: number; meanScore: number }>;
  /** Richer statistics arrays (also public on AniList). */
  voiceActors?: Array<AniListStatDistribution & { voiceActor?: AniListPersonNode }>;
  staff?: Array<AniListStatDistribution & { staff?: AniListPersonNode }>;
  startYears?: Array<AniListStatDistribution & { startYear: number }>;
  lengths?: Array<AniListStatDistribution & { length: string | null }>;
  countries?: Array<AniListStatDistribution & { country: string | null }>;
}

/** A favourited media node (anime/manga MediaConnection). */
export interface AniListFavouriteMediaNode {
  id: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
}

/** A favourited studio node. Studios have no image. */
export interface AniListFavouriteStudioNode {
  id: number;
  name: string;
}

export interface AniListUserFavourites {
  // Connection nodes can be null (e.g. deleted media/characters), so each
  // array element is nullable and consumers must filter before mapping.
  anime?: { nodes?: Array<AniListFavouriteMediaNode | null> };
  manga?: { nodes?: Array<AniListFavouriteMediaNode | null> };
  characters?: { nodes?: Array<AniListPersonNode | null> };
  staff?: { nodes?: Array<AniListPersonNode | null> };
  studios?: { nodes?: Array<AniListFavouriteStudioNode | null> };
}

export interface AniListUserProfile {
  id: number;
  name: string;
  avatar?: { large?: string; medium?: string };
  bannerImage?: string;
  about?: string;
  siteUrl?: string;
  createdAt?: number;
  statistics?: {
    anime?: AniListUserStatistics;
  };
  favourites?: AniListUserFavourites;
}

export interface UserProfileResponse {
  User: AniListUserProfile;
}

/** Raw `Viewer` GraphQL response — same shape as a `User`. */
export interface ViewerProfileResponse {
  Viewer: AniListUserProfile;
}

// ============================================
// Activity Feed (viewer)
// ============================================

/**
 * A single entry from `Page.activities`. The `__typename` discriminator selects
 * which inline-fragment fields are present; MessageActivity entries carry only
 * `__typename` and are filtered out by the mapper.
 */
export interface AniListActivityNode {
  __typename?: string;
  id: number;
  // ListActivity fields
  status?: string | null;
  progress?: string | null;
  media?: {
    id: number;
    title: AniListMediaTitle;
    coverImage: AniListCoverImage;
  } | null;
  // TextActivity fields
  text?: string | null;
  createdAt: number;
  /**
   * The activity's author. Selected only by the SOCIAL feed query
   * (`activities(isFollowing: true)`); absent on the own-viewer feed.
   */
  user?: AniListActivityUserNode | null;
}

/** Raw author node selected by the social feed (`user { id name avatar }`). */
export interface AniListActivityUserNode {
  id: number;
  name: string;
  avatar?: { large?: string; medium?: string } | null;
}

/** Raw `Page { activities }` GraphQL response shape for the viewer feed. */
export interface ViewerActivityResponse {
  Page: {
    activities: Array<AniListActivityNode | null> | null;
  } | null;
}

/** Raw `Page { activities }` response for the social (following) feed. */
export type SocialFeedResponse = ViewerActivityResponse;

// ============================================
// Social Graph (following / followers)
// ============================================

/** Raw user node selected by the following/followers queries. */
export interface AniListFollowUserNode {
  id: number;
  name: string;
  avatar?: { large?: string; medium?: string } | null;
  isFollowing?: boolean | null;
  siteUrl?: string | null;
}

/** Raw `Page { following }` GraphQL response shape. */
export interface FollowingResponse {
  Page: {
    following: Array<AniListFollowUserNode | null> | null;
  } | null;
}

/** Raw `Page { followers }` GraphQL response shape. */
export interface FollowersResponse {
  Page: {
    followers: Array<AniListFollowUserNode | null> | null;
  } | null;
}

/** Raw `ToggleFollow` mutation response shape. */
export interface ToggleFollowResponse {
  ToggleFollow: {
    id: number;
    isFollowing: boolean | null;
  } | null;
}

// ============================================
// Notifications
// ============================================

/** Raw media node selected inside airing/related-media notifications. */
export interface AniListNotificationMediaNode {
  id: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
}

/** Raw user node selected inside following/activity notifications. */
export interface AniListNotificationUserNode {
  id: number;
  name: string;
  avatar?: { large?: string; medium?: string } | null;
}

/**
 * A single raw entry from `Page.notifications` (a `NotificationUnion`). The
 * `__typename` discriminator selects which inline-fragment fields are present;
 * unhandled union members carry only `__typename` and are dropped by the mapper.
 *
 * `contexts` is the AiringNotification's `[String]`; `context` is the singular
 * string on every other handled variant.
 */
export interface AniListNotificationNode {
  __typename?: string;
  id: number;
  type?: string | null;
  createdAt?: number | null;
  /** AiringNotification only — a `[String]` joined into a display context. */
  contexts?: Array<string | null> | null;
  /** Singular context on the non-airing variants. */
  context?: string | null;
  /** AiringNotification only. */
  episode?: number | null;
  /** Activity like/reply/mention notifications only. */
  activityId?: number | null;
  /** Airing + related-media notifications. */
  media?: AniListNotificationMediaNode | null;
  /** Following + activity notifications. */
  user?: AniListNotificationUserNode | null;
}

/**
 * Raw response for the notifications query — `Viewer.unreadNotificationCount` for
 * the badge plus `Page.notifications` for the list.
 */
export interface NotificationsResponse {
  Viewer: { unreadNotificationCount?: number | null } | null;
  Page: {
    notifications: Array<AniListNotificationNode | null> | null;
  } | null;
}

// ============================================
// MediaList (two-way sync)
// ============================================

/** AniList list-entry status enum (superset of the local AnimeStatus). */
export type AniListMediaListStatus =
  | 'CURRENT'
  | 'PLANNING'
  | 'COMPLETED'
  | 'DROPPED'
  | 'PAUSED'
  | 'REPEATING';

/**
 * A single MediaList entry, normalized from the raw GraphQL response into the
 * flat shape the reconciler consumes. `score` is always on the POINT_100 scale
 * (requested via `score(format: POINT_100)`) regardless of the user's display
 * format; `updatedAt` is epoch seconds.
 */
export interface AniListMediaListEntry {
  mediaId: number;
  status: AniListMediaListStatus | null;
  progress: number | null;
  /** 0–100. AniList uses 0 to mean "unrated". */
  score: number | null;
  notes: string | null;
  updatedAt: number;
  episodes?: number;
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  coverImage?: string;
  /**
   * The anime's MyAnimeList id (AniList `Media.idMal`), or undefined when AniList
   * has no MAL cross-ref. Carried through the sync so the AniList adapter can
   * populate the local `mal_id` column — the MAL sync then matches by exact id.
   */
  idMal?: number;
}

/** Raw `MediaListCollection` GraphQL response shape. */
export interface MediaListCollectionResponse {
  MediaListCollection: {
    lists: Array<{
      entries: Array<{
        mediaId: number;
        status: AniListMediaListStatus | null;
        progress: number | null;
        score: number | null;
        notes: string | null;
        updatedAt: number | null;
        media: {
          id: number;
          idMal: number | null;
          episodes: number | null;
          title: AniListMediaTitle;
          coverImage: AniListCoverImage;
        } | null;
      }> | null;
    }> | null;
  } | null;
}

/**
 * Raw `MediaList` GraphQL response shape for a single user+media entry. `null`
 * when the user has no list entry for that media (AniList returns a 404 GraphQL
 * error, which the client maps to a null result).
 */
export interface MediaListEntryResponse {
  MediaList: {
    status: AniListMediaListStatus | null;
    progress: number | null;
    score: number | null;
    notes: string | null;
    updatedAt: number | null;
    media: {
      idMal: number | null;
      episodes: number | null;
      title: AniListMediaTitle;
      coverImage: AniListCoverImage;
    } | null;
  } | null;
}

/** Input for the `SaveMediaListEntry` mutation. Absent fields are NOT written. */
export interface SaveMediaListEntryInput {
  mediaId: number;
  status?: AniListMediaListStatus;
  progress?: number;
  /** 0–100 (POINT_100 scale). Omit (not 0) to leave the remote score unchanged. */
  scoreRaw?: number;
  notes?: string;
}

/** Raw `SaveMediaListEntry` mutation response shape. */
export interface SaveMediaListEntryResponse {
  SaveMediaListEntry: {
    mediaId: number;
    status: AniListMediaListStatus | null;
    progress: number | null;
    score: number | null;
    notes: string | null;
    updatedAt: number | null;
  };
}

// ============================================
// Community Recommendations
// ============================================

/** AniList recommendation vote enum. */
export type AniListRecommendationRating = 'RATE_UP' | 'RATE_DOWN' | 'NO_RATING';

/** A media node as selected by the recommendations query (source + recommended). */
export interface AniListRecommendationMedia {
  id: number;
  title: AniListMediaTitle;
  coverImage: AniListCoverImage;
  format?: string;
  averageScore?: number;
}

/** A single raw `Page.recommendations` node. */
export interface AniListRecommendationEntry {
  id: number;
  rating: number | null;
  userRating: AniListRecommendationRating | null;
  media: AniListRecommendationMedia | null;
  mediaRecommendation: AniListRecommendationMedia | null;
}

/** Raw `Page { recommendations }` GraphQL response shape. */
export interface RecommendationsResponse {
  Page: {
    recommendations: Array<AniListRecommendationEntry | null> | null;
  } | null;
}

/** Raw `SaveRecommendation` mutation response shape. */
export interface SaveRecommendationResponse {
  SaveRecommendation: {
    id: number;
    rating: number | null;
    userRating: AniListRecommendationRating | null;
  } | null;
}
