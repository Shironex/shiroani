import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  createLogger,
  AniListSyncEvents,
  LibraryEvents,
  CrudActions,
  type AniListSyncResult,
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
}
