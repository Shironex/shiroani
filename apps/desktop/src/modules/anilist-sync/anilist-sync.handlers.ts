import {
  anilistSyncEntryPayloadSchema,
  AniListSyncEvents,
  createLogger,
  CrudActions,
  fullSyncPayloadSchema,
  LibraryEvents,
  type AniListSyncResult,
  type BackendEventPublisher,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { AniListSyncService } from './anilist-sync.service';

const logger = createLogger('AniListSyncHandlers');

/** Zeroed tally used as the error fallback (handleGatewayRequest appends `error`). */
const EMPTY_RESULT: AniListSyncResult = {
  imported: 0,
  pushedNew: 0,
  updatedLocal: 0,
  updatedRemote: 0,
  unchanged: 0,
  conflicts: 0,
  skippedNoId: 0,
  errors: 0,
};

type AniListSyncHandlers = Pick<
  BackendHandlers,
  typeof AniListSyncEvents.SYNC | typeof AniListSyncEvents.SYNC_ENTRY
>;

export function createAniListSyncHandlers(
  sync: AniListSyncService,
  events: BackendEventPublisher
): AniListSyncHandlers {
  return {
    /**
     * Run a full-library sync in the requested direction; a missing payload means
     * two-way. Streams per-entry progress and resolves with the tally. On any local
     * write, broadcasts so the library store refetches. A push-only run writes
     * nothing locally, so it does not broadcast.
     */
    [AniListSyncEvents.SYNC]: payload =>
      handleGatewayRequest({
        logger,
        action: AniListSyncEvents.SYNC,
        defaultResult: EMPTY_RESULT,
        schema: fullSyncPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await sync.sync(
            progress => events.emit(AniListSyncEvents.PROGRESS, progress),
            parsed
          );

          if (result.imported > 0 || result.updatedLocal > 0) {
            events.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
          }

          return result;
        },
      }),

    /**
     * Sync one library entry by local id. Shares the full sync's single-flight
     * guard, so it reports an error while a full sync runs.
     */
    [AniListSyncEvents.SYNC_ENTRY]: payload =>
      handleGatewayRequest({
        logger,
        action: AniListSyncEvents.SYNC_ENTRY,
        defaultResult: { action: 'error' },
        schema: anilistSyncEntryPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await sync.syncEntry(parsed.localId, parsed.direction);

          // Every outcome except these stamps the sync baselines, which changes the
          // row's `synced` flag and `anilistSyncedAt`. The store refetches off this
          // broadcast, so it has to fire even for 'unchanged'.
          if (result.action !== 'skipped' && result.action !== 'error') {
            events.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
          }

          return result;
        },
      }),
  };
}
