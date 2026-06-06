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
  favourites?: {
    anime?: {
      nodes?: Array<{
        id: number;
        title: AniListMediaTitle;
        coverImage: AniListCoverImage;
      }>;
    };
  };
}

export interface UserProfileResponse {
  User: AniListUserProfile;
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
          episodes: number | null;
          title: AniListMediaTitle;
          coverImage: AniListCoverImage;
        } | null;
      }> | null;
    }> | null;
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
