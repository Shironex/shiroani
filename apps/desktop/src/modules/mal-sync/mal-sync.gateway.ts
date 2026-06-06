import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  createLogger,
  MalSyncEvents,
  LibraryEvents,
  CrudActions,
  malSyncEntryPayloadSchema,
  type SyncResult,
  type SyncEntryResult,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { MalSyncService } from './mal-sync.service';

const logger = createLogger('MalSyncGateway');

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

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class MalSyncGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly syncService: MalSyncService) {
    logger.info('MalSyncGateway initialized');
  }

  /**
   * Run a two-way MAL sync. Streams per-entry progress over
   * {@link MalSyncEvents.PROGRESS} and resolves the ack with the final tally.
   * Long-running — the client emits with an extended timeout. On any local
   * mutation, broadcasts {@link LibraryEvents.UPDATED} so the library store
   * re-fetches. The MAL run has its OWN single-flight guard (independent of the
   * AniList sync gateway), so the two can run concurrently.
   */
  @SubscribeMessage(MalSyncEvents.SYNC)
  handleSync() {
    return handleGatewayRequest({
      logger,
      action: MalSyncEvents.SYNC,
      defaultResult: EMPTY_RESULT,
      handler: async () => {
        const result = await this.syncService.sync(progress =>
          this.server.emit(MalSyncEvents.PROGRESS, progress)
        );

        if (result.imported > 0 || result.updatedLocal > 0) {
          this.server.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
        }

        return result;
      },
    });
  }

  /**
   * Sync a SINGLE library entry by local id, with a forced direction
   * ('push'/'pull') or 'auto'. Resolves the ack with `{ action }`. Shares the
   * MAL full sync's single-flight guard (rejects via the ack `error` field if a
   * MAL sync is running). Broadcasts {@link LibraryEvents.UPDATED} whenever the
   * row's sync state changed ('pushed' / 'updated' / 'unchanged'), mirroring the
   * AniList sync gateway.
   */
  @SubscribeMessage(MalSyncEvents.SYNC_ENTRY)
  handleSyncEntry(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: MalSyncEvents.SYNC_ENTRY,
      defaultResult: { action: 'error' } as SyncEntryResult,
      schema: malSyncEntryPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.syncService.syncEntry(parsed.localId, parsed.direction);

        // Every non-skip outcome stamps the entry's MAL baselines via
        // `markMalSync` — which flips the renderer-facing `malSynced` flag. The
        // library store refetches off this broadcast, so broadcast whenever the
        // row's sync state changed. Only 'skipped' / 'error' leave the row untouched.
        if (result.action !== 'skipped' && result.action !== 'error') {
          this.server.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
        }

        return result;
      },
    });
  }
}
