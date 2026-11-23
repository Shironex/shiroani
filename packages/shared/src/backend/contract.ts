/**
 * Compile-time contract for the backend IPC bridge. Types only. Runtime channel
 * lists live in `./channels` so the sandboxed preload can import them.
 */
import type { z } from 'zod';
import type {
  AniListSyncEvents,
  AnimeEvents,
  BackendEvents,
  CrudActions,
  DiaryEvents,
  FeedEvents,
  ImportExportEvents,
  LibraryEvents,
  MalEvents,
  MalSyncEvents,
  ScheduleEvents,
} from '../constants/events';
import type { exportRequestSchema, importRequestSchema } from '../schemas/import-export';
import type {
  feedGetArticlePayloadSchema,
  feedGetItemsPayloadSchema,
  feedMarkReadPayloadSchema,
  feedSetLastVisitedPayloadSchema,
  feedToggleSourcePayloadSchema,
} from '../schemas/feed';
import type {
  animeGetAiringPayloadSchema,
  animeGetDetailsPayloadSchema,
  animeGetFollowPayloadSchema,
  animeGetPopularPayloadSchema,
  animeGetRandomPayloadSchema,
  animeGetRecommendationsPayloadSchema,
  animeGetSeasonalPayloadSchema,
  animeGetTrendingPayloadSchema,
  animeGetUserProfilePayloadSchema,
  animeSaveMediaListEntryPayloadSchema,
  animeSaveRecommendationPayloadSchema,
  animeSearchPayloadSchema,
  animeToggleFollowPayloadSchema,
  anilistSyncEntryPayloadSchema,
  fullSyncPayloadSchema,
  malSyncEntryPayloadSchema,
  libraryAddPayloadSchema,
  libraryGetAllPayloadSchema,
  libraryRemoveManyPayloadSchema,
  libraryRemovePayloadSchema,
  libraryUpdateManyPayloadSchema,
  libraryUpdatePayloadSchema,
} from '../schemas/anime';
import type {
  diaryCreatePayloadSchema,
  diaryRemovePayloadSchema,
  diaryUpdatePayloadSchema,
} from '../schemas/diary';
import type {
  scheduleGetDailyPayloadSchema,
  scheduleGetWeeklyPayloadSchema,
} from '../schemas/schedule';
import type {
  AiringAnime,
  AniListActivity,
  AniListCommunityRecommendation,
  AniListUser,
  AnimeDetail,
  AnimeEntry,
  DiscoverMedia,
  GetNotificationsResult,
  LibraryStatsResult,
  RecommendationRating,
  UserProfile,
} from '../types/anime';
import type {
  AniListSyncEntryResult,
  AniListSyncProgress,
  AniListSyncResult,
} from '../types/anilist-sync';
import type { DiaryEntry } from '../types/diary';
import type {
  ImportItemResult,
  ImportResponse,
  ShiroaniExportFormat,
} from '../types/import-export';
import type { MalUserStats } from '../types/mal-auth';
import type {
  FeedGetArticleResult,
  FeedGetItemsResult,
  FeedGetLastVisitedResult,
  FeedGetReadIdsResult,
  FeedGetSourcesResult,
} from '../types/feed';
import type { BACKEND_EVENT_CHANNELS, BACKEND_REQUEST_CHANNELS } from './channels';

export type BackendRequestChannel = (typeof BACKEND_REQUEST_CHANNELS)[number];
export type BackendEventChannel = (typeof BACKEND_EVENT_CHANNELS)[number];

/** A request with nothing to send. The renderer's list fetches pass an empty object. */
type NoPayload = Record<string, never> | undefined;

/** One page of a media browse, as the discover views consume it. */
interface MediaPageResponse {
  results: DiscoverMedia[];
  pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
}

/** Request and response shape of every request channel. */
export interface BackendRoutes {
  [BackendEvents.PING]: { req: undefined; res: { ok: true } };

  [DiaryEvents.GET_ALL]: { req: NoPayload; res: { entries: DiaryEntry[] } };
  [DiaryEvents.CREATE]: {
    req: z.infer<typeof diaryCreatePayloadSchema>;
    res: { entry: DiaryEntry | null };
  };
  [DiaryEvents.UPDATE]: {
    req: z.infer<typeof diaryUpdatePayloadSchema>;
    res: { entry: DiaryEntry | null };
  };
  [DiaryEvents.REMOVE]: {
    req: z.infer<typeof diaryRemovePayloadSchema>;
    res: { success: boolean };
  };

  [ScheduleEvents.GET_DAILY]: {
    req: z.infer<typeof scheduleGetDailyPayloadSchema>;
    res: { date: string; entries: AiringAnime[] };
  };
  [ScheduleEvents.GET_WEEKLY]: {
    req: z.infer<typeof scheduleGetWeeklyPayloadSchema>;
    res: { schedule: Record<string, AiringAnime[]> };
  };

  [LibraryEvents.GET_ALL]: {
    req: z.infer<typeof libraryGetAllPayloadSchema>;
    res: { entries: AnimeEntry[] };
  };
  [LibraryEvents.ADD]: {
    req: z.infer<typeof libraryAddPayloadSchema>;
    res: { entry: AnimeEntry | null };
  };
  [LibraryEvents.UPDATE]: {
    req: z.infer<typeof libraryUpdatePayloadSchema>;
    res: { entry: AnimeEntry | null };
  };
  [LibraryEvents.UPDATE_MANY]: {
    req: z.infer<typeof libraryUpdateManyPayloadSchema>;
    res: { entries: AnimeEntry[] };
  };
  [LibraryEvents.GET_STATS]: { req: NoPayload; res: { stats: LibraryStatsResult | null } };
  [LibraryEvents.REMOVE]: {
    req: z.infer<typeof libraryRemovePayloadSchema>;
    res: { success: boolean };
  };
  [LibraryEvents.REMOVE_MANY]: {
    req: z.infer<typeof libraryRemoveManyPayloadSchema>;
    res: { ids: number[] };
  };

  [FeedEvents.GET_ITEMS]: {
    req: z.infer<typeof feedGetItemsPayloadSchema>;
    res: FeedGetItemsResult;
  };
  [FeedEvents.GET_SOURCES]: { req: NoPayload; res: FeedGetSourcesResult };
  [FeedEvents.TOGGLE_SOURCE]: {
    req: z.infer<typeof feedToggleSourcePayloadSchema>;
    res: FeedGetSourcesResult;
  };
  [FeedEvents.GET_ARTICLE]: {
    req: z.infer<typeof feedGetArticlePayloadSchema>;
    res: FeedGetArticleResult;
  };
  [FeedEvents.MARK_READ]: {
    req: z.infer<typeof feedMarkReadPayloadSchema>;
    res: { ok: boolean };
  };
  [FeedEvents.GET_READ_IDS]: { req: NoPayload; res: FeedGetReadIdsResult };
  [FeedEvents.SET_LAST_VISITED]: {
    req: z.infer<typeof feedSetLastVisitedPayloadSchema>;
    res: { ok: boolean };
  };
  [FeedEvents.GET_LAST_VISITED]: { req: NoPayload; res: FeedGetLastVisitedResult };
  [FeedEvents.REFRESH]: { req: NoPayload; res: { started: boolean } };

  [AnimeEvents.SEARCH]: {
    req: z.infer<typeof animeSearchPayloadSchema>;
    res: MediaPageResponse;
  };
  [AnimeEvents.GET_DETAILS]: {
    req: z.infer<typeof animeGetDetailsPayloadSchema>;
    res: { anime: AnimeDetail | null };
  };
  [AnimeEvents.GET_AIRING]: {
    req: z.infer<typeof animeGetAiringPayloadSchema>;
    res: { airingSchedules: AiringAnime[]; pageInfo: MediaPageResponse['pageInfo'] };
  };
  [AnimeEvents.GET_TRENDING]: {
    req: z.infer<typeof animeGetTrendingPayloadSchema>;
    res: MediaPageResponse;
  };
  [AnimeEvents.GET_POPULAR]: {
    req: z.infer<typeof animeGetPopularPayloadSchema>;
    res: MediaPageResponse;
  };
  [AnimeEvents.GET_SEASONAL]: {
    req: z.infer<typeof animeGetSeasonalPayloadSchema>;
    res: MediaPageResponse;
  };
  [AnimeEvents.GET_RANDOM]: {
    req: z.infer<typeof animeGetRandomPayloadSchema>;
    res: MediaPageResponse;
  };
  [AnimeEvents.GET_USER_PROFILE]: {
    req: z.infer<typeof animeGetUserProfilePayloadSchema>;
    res: { profile: UserProfile | null };
  };
  [AnimeEvents.GET_VIEWER_PROFILE]: { req: NoPayload; res: { profile: UserProfile | null } };
  [MalEvents.GET_VIEWER_PROFILE]: { req: NoPayload; res: { profile: MalUserStats | null } };
  [AnimeEvents.GET_VIEWER_ACTIVITY]: { req: NoPayload; res: { activities: AniListActivity[] } };
  [AnimeEvents.SAVE_MEDIA_LIST_ENTRY]: {
    req: z.infer<typeof animeSaveMediaListEntryPayloadSchema>;
    res: { updatedAt: number | null };
  };
  [AnimeEvents.GET_RECOMMENDATIONS]: {
    req: z.infer<typeof animeGetRecommendationsPayloadSchema>;
    res: { recommendations: AniListCommunityRecommendation[] };
  };
  [AnimeEvents.SAVE_RECOMMENDATION]: {
    req: z.infer<typeof animeSaveRecommendationPayloadSchema>;
    res: { userRating: RecommendationRating | null };
  };
  [AnimeEvents.GET_FOLLOWING]: {
    req: z.infer<typeof animeGetFollowPayloadSchema>;
    res: { users: AniListUser[] };
  };
  [AnimeEvents.GET_FOLLOWERS]: {
    req: z.infer<typeof animeGetFollowPayloadSchema>;
    res: { users: AniListUser[] };
  };
  [AnimeEvents.TOGGLE_FOLLOW]: {
    req: z.infer<typeof animeToggleFollowPayloadSchema>;
    res: { isFollowing: boolean | null };
  };
  [AnimeEvents.GET_SOCIAL_FEED]: { req: NoPayload; res: { activities: AniListActivity[] } };
  [AnimeEvents.GET_NOTIFICATIONS]: { req: NoPayload; res: GetNotificationsResult };
  [AnimeEvents.MARK_NOTIFICATIONS_READ]: { req: NoPayload; res: { unreadCount: number } };

  [ImportExportEvents.EXPORT]: {
    req: z.infer<typeof exportRequestSchema>;
    res: { data: ShiroaniExportFormat | null; totalExported: number };
  };
  [ImportExportEvents.IMPORT]: {
    req: z.infer<typeof importRequestSchema>;
    res: ImportResponse;
  };
  [ImportExportEvents.CLEAR_ALL]: { req: NoPayload; res: { success: boolean } };

  [AniListSyncEvents.SYNC]: {
    req: z.input<typeof fullSyncPayloadSchema>;
    res: AniListSyncResult;
  };
  [AniListSyncEvents.SYNC_ENTRY]: {
    req: z.infer<typeof anilistSyncEntryPayloadSchema>;
    res: AniListSyncEntryResult;
  };
  [MalSyncEvents.SYNC]: {
    req: z.input<typeof fullSyncPayloadSchema>;
    res: AniListSyncResult;
  };
  [MalSyncEvents.SYNC_ENTRY]: {
    req: z.infer<typeof malSyncEntryPayloadSchema>;
    res: AniListSyncEntryResult;
  };
}

/** Payload of every event channel. */
export interface BackendEventMap {
  [BackendEvents.RESUMED]: undefined;
  [DiaryEvents.UPDATED]:
    | { entry: DiaryEntry; action: typeof CrudActions.CREATED | typeof CrudActions.UPDATED }
    | { id: number; action: typeof CrudActions.REMOVED }
    | { action: typeof CrudActions.IMPORTED };
  [LibraryEvents.UPDATED]:
    | { entry: AnimeEntry; action: typeof CrudActions.ADDED | typeof CrudActions.UPDATED }
    | { id: number; action: typeof CrudActions.REMOVED }
    | { entries: AnimeEntry[]; action: typeof CrudActions.UPDATED_MANY }
    | { ids: number[]; action: typeof CrudActions.REMOVED_MANY }
    | { action: typeof CrudActions.IMPORTED };
  [FeedEvents.NEW_ITEMS]: { newItemsCount: number };
  [FeedEvents.SOURCES_RESULT]: FeedGetSourcesResult;
  [ImportExportEvents.IMPORT_PROGRESS]: ImportItemResult;
  [AniListSyncEvents.PROGRESS]: AniListSyncProgress;
  [MalSyncEvents.PROGRESS]: AniListSyncProgress;
}

export type BackendReq<C extends BackendRequestChannel> = BackendRoutes[C]['req'];
export type BackendRes<C extends BackendRequestChannel> = BackendRoutes[C]['res'];

/**
 * What crosses IPC for a channel. Handlers report domain errors in this envelope
 * rather than throwing, because Electron drops custom error fields on rejection.
 * The renderer facade turns `error` into a rejected promise.
 */
export type BackendWire<C extends BackendRequestChannel> = BackendRes<C> & { error?: string };

/** Lets a channel with no payload be invoked with only its name. */
export type BackendInvokeArgs<C extends BackendRequestChannel> =
  undefined extends BackendReq<C> ? [payload?: BackendReq<C>] : [payload: BackendReq<C>];

/** The bridge exposed to the renderer as `window.electronAPI.backend`. */
export interface BackendBridge {
  invoke<C extends BackendRequestChannel>(
    channel: C,
    ...args: BackendInvokeArgs<C>
  ): Promise<BackendWire<C>>;
  on<E extends BackendEventChannel>(
    event: E,
    callback: (data: BackendEventMap[E]) => void
  ): () => void;
}

/** Port services and handlers use to publish events, whatever the transport. */
export interface BackendEventPublisher {
  emit<E extends BackendEventChannel>(event: E, data: BackendEventMap[E]): void;
}
