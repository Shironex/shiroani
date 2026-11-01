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
import { BackendEvents, DiaryEvents, LibraryEvents, ScheduleEvents } from '../constants/events';

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
] as const;

export const BACKEND_EVENT_CHANNELS = [DiaryEvents.UPDATED, LibraryEvents.UPDATED] as const;
