/**
 * Runtime allow-lists for the backend IPC bridge.
 *
 * The sandboxed preload imports this module, and a sandboxed preload can only
 * require `electron`. Keep the only import below free of runtime dependencies:
 * `apps/desktop/esbuild.config.mjs` fails the build if zod or anything else
 * reaches the preload bundle.
 *
 * These lists are also the routing switch: a request channel listed here goes
 * over IPC in the renderer, and anything else stays on the socket.
 */
import {
  AnimeEvents,
  BackendEvents,
  DiaryEvents,
  FeedEvents,
  ImportExportEvents,
  LibraryEvents,
  MalEvents,
  ScheduleEvents,
} from '../constants/events';

export const BACKEND_REQUEST_CHANNELS = [
  BackendEvents.PING,
  DiaryEvents.GET_ALL,
  DiaryEvents.CREATE,
  DiaryEvents.UPDATE,
  DiaryEvents.REMOVE,
  ScheduleEvents.GET_DAILY,
  ScheduleEvents.GET_WEEKLY,
  LibraryEvents.GET_ALL,
  LibraryEvents.ADD,
  LibraryEvents.UPDATE,
  LibraryEvents.UPDATE_MANY,
  LibraryEvents.GET_STATS,
  LibraryEvents.REMOVE,
  LibraryEvents.REMOVE_MANY,
  FeedEvents.GET_ITEMS,
  FeedEvents.GET_SOURCES,
  FeedEvents.TOGGLE_SOURCE,
  FeedEvents.GET_ARTICLE,
  FeedEvents.MARK_READ,
  FeedEvents.GET_READ_IDS,
  FeedEvents.SET_LAST_VISITED,
  FeedEvents.GET_LAST_VISITED,
  FeedEvents.REFRESH,
  AnimeEvents.SEARCH,
  AnimeEvents.GET_DETAILS,
  AnimeEvents.GET_AIRING,
  AnimeEvents.GET_TRENDING,
  AnimeEvents.GET_POPULAR,
  AnimeEvents.GET_SEASONAL,
  AnimeEvents.GET_RANDOM,
  AnimeEvents.GET_USER_PROFILE,
  AnimeEvents.GET_VIEWER_PROFILE,
  MalEvents.GET_VIEWER_PROFILE,
  AnimeEvents.GET_VIEWER_ACTIVITY,
  AnimeEvents.SAVE_MEDIA_LIST_ENTRY,
  AnimeEvents.GET_RECOMMENDATIONS,
  AnimeEvents.SAVE_RECOMMENDATION,
  AnimeEvents.GET_FOLLOWING,
  AnimeEvents.GET_FOLLOWERS,
  AnimeEvents.TOGGLE_FOLLOW,
  AnimeEvents.GET_SOCIAL_FEED,
  AnimeEvents.GET_NOTIFICATIONS,
  AnimeEvents.MARK_NOTIFICATIONS_READ,
  ImportExportEvents.EXPORT,
  ImportExportEvents.IMPORT,
  ImportExportEvents.CLEAR_ALL,
] as const;

export const BACKEND_EVENT_CHANNELS = [
  DiaryEvents.UPDATED,
  LibraryEvents.UPDATED,
  FeedEvents.NEW_ITEMS,
  FeedEvents.SOURCES_RESULT,
  ImportExportEvents.IMPORT_PROGRESS,
] as const;
