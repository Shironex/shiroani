import {
  createLogger,
  CrudActions,
  fullSyncPayloadSchema,
  LibraryEvents,
  malSyncEntryPayloadSchema,
  MalSyncEvents,
  type BackendEventPublisher,
  type SyncResult,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { MalSyncService } from './mal-sync.service';

const logger = createLogger('MalSyncHandlers');

/** Zeroed tally used as the error fallback (handleGatewayRequest appends `error`). */
const EMPTY_RESULT: SyncResult = {
  imported: 0,
  pushedNew: 0,
  updatedLocal: 0,
  updatedRemote: 0,
  unchanged: 0,
  conflicts: 0,
  skippedNoId: 0,
  errors: 0,
};

type MalSyncHandlers = Pick<
  BackendHandlers,
  typeof MalSyncEvents.SYNC | typeof MalSyncEvents.SYNC_ENTRY
>;

export function createMalSyncHandlers(
  sync: MalSyncService,
  events: BackendEventPublisher
): MalSyncHandlers {
  return {
    /**
     * Run a full-library sync in the requested direction; a missing payload means
     * two-way. Streams per-entry progress and resolves with the tally. On any local
     * write, broadcasts so the library store refetches. The MAL run has its own
     * single-flight guard, so it can run alongside an AniList sync.
     */
    [MalSyncEvents.SYNC]: payload =>
      handleGatewayRequest({
        logger,
        action: MalSyncEvents.SYNC,
        defaultResult: EMPTY_RESULT,
        schema: fullSyncPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await sync.sync(
            progress => events.emit(MalSyncEvents.PROGRESS, progress),
            parsed
          );

          if (result.imported > 0 || result.updatedLocal > 0) {
            events.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
          }

          return result;
        },
      }),

    /** Sync one library entry by local id. Shares the MAL single-flight guard. */
    [MalSyncEvents.SYNC_ENTRY]: payload =>
      handleGatewayRequest({
        logger,
        action: MalSyncEvents.SYNC_ENTRY,
        defaultResult: { action: 'error' },
        schema: malSyncEntryPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await sync.syncEntry(parsed.localId, parsed.direction);

          // Every outcome except these stamps the sync baselines, which changes the
          // row's `malSynced` flag. The store refetches off this broadcast.
          if (result.action !== 'skipped' && result.action !== 'error') {
            events.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
          }

          return result;
        },
      }),
  };
}
