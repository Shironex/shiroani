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
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  coverImage?: string;
  episodes?: number;
  status?: AnimeStatus;
  currentEpisode?: number;
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
  };
  favourites: Array<{
    id: number;
    title: { romaji?: string; english?: string; native?: string };
    coverImage?: string;
  }>;
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
