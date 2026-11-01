/**
 * Compile-time contract for the backend IPC bridge. Types only. Runtime channel
 * lists live in `./channels` so the sandboxed preload can import them.
 */
import type { z } from 'zod';
import type {
  BackendEvents,
  CrudActions,
  DiaryEvents,
  LibraryEvents,
  ScheduleEvents,
} from '../constants/events';
import type {
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
import type { AiringAnime, AnimeEntry, LibraryStatsResult } from '../types/anime';
import type { DiaryEntry } from '../types/diary';
import type { BACKEND_EVENT_CHANNELS, BACKEND_REQUEST_CHANNELS } from './channels';

export type BackendRequestChannel = (typeof BACKEND_REQUEST_CHANNELS)[number];
export type BackendEventChannel = (typeof BACKEND_EVENT_CHANNELS)[number];

/** A request with nothing to send. The renderer's list fetches pass an empty object. */
type NoPayload = Record<string, never> | undefined;

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
}

/** Payload of every event channel. */
export interface BackendEventMap {
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
