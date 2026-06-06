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
  AniListSyncEvents,
  LibraryEvents,
  CrudActions,
  anilistSyncEntryPayloadSchema,
  type AniListSyncResult,
  type AniListSyncEntryResult,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { AniListSyncService } from './anilist-sync.service';

const logger = createLogger('AniListSyncGateway');

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

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class AniListSyncGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly syncService: AniListSyncService) {
    logger.info('AniListSyncGateway initialized');
  }

  /**
   * Run a two-way AniList sync. Streams per-entry progress over
   * {@link AniListSyncEvents.PROGRESS} and resolves the ack with the final
   * tally. Long-running — the client emits with an extended timeout (mirrors the
   * import flow). On any local mutation, broadcasts {@link LibraryEvents.UPDATED}
   * so the library store re-fetches.
   */
  @SubscribeMessage(AniListSyncEvents.SYNC)
  handleSync() {
    return handleGatewayRequest({
      logger,
      action: AniListSyncEvents.SYNC,
      defaultResult: EMPTY_RESULT,
      handler: async () => {
        const result = await this.syncService.sync(progress =>
          this.server.emit(AniListSyncEvents.PROGRESS, progress)
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
   * full sync's single-flight guard (rejects via the ack `error` field if a full
   * sync is running). When the local row may have changed (an import/pull/update
   * that wrote locally), broadcasts {@link LibraryEvents.UPDATED} so the library
   * store re-fetches — mirroring the full-sync handler.
   */
  @SubscribeMessage(AniListSyncEvents.SYNC_ENTRY)
  handleSyncEntry(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: AniListSyncEvents.SYNC_ENTRY,
      defaultResult: { action: 'error' } as AniListSyncEntryResult,
      schema: anilistSyncEntryPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.syncService.syncEntry(parsed.localId, parsed.direction);

        // Every non-skip outcome stamps the entry's AniList baselines via
        // `markAniListSync` — which flips the renderer-facing `synced` flag and
        // updates `anilistSyncedAt` on the row. The library store refetches off
        // this broadcast (no per-op ack wiring), so broadcast whenever the row's
        // sync state changed: 'pushed' / 'updated' / 'unchanged'. Only 'skipped'
        // (no mediaId / no remote) and 'error' (never reaches here — thrown and
        // caught upstream) leave the row untouched.
        if (result.action !== 'skipped' && result.action !== 'error') {
          this.server.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
        }

        return result;
      },
    });
  }
}
