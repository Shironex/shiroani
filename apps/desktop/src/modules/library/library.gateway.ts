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
  LibraryEvents,
  CrudActions,
  libraryGetAllPayloadSchema,
  libraryAddPayloadSchema,
  libraryUpdatePayloadSchema,
  libraryRemovePayloadSchema,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { LibraryService } from './library.service';

const logger = createLogger('LibraryGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class LibraryGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly libraryService: LibraryService) {
    logger.info('LibraryGateway initialized');
  }

  @SubscribeMessage(LibraryEvents.GET_ALL)
  handleGetAll(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: LibraryEvents.GET_ALL,
      defaultResult: { entries: [] },
      schema: libraryGetAllPayloadSchema,
      payload,
      handler: async parsed => {
        const entries = this.libraryService.getAllEntries(parsed?.status);
        return { entries };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.ADD)
  handleAdd(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: LibraryEvents.ADD,
      defaultResult: { entry: null },
      schema: libraryAddPayloadSchema,
      payload,
      handler: async parsed => {
        const entry = this.libraryService.addEntry(parsed);
        this.server.emit(LibraryEvents.UPDATED, { entry, action: CrudActions.ADDED });
        return { entry };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.UPDATE)
  handleUpdate(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: LibraryEvents.UPDATE,
      defaultResult: { entry: null },
      schema: libraryUpdatePayloadSchema,
      payload,
      handler: async parsed => {
        const { id, ...updates } = parsed;
        const entry = this.libraryService.updateEntry(id, updates);
        if (!entry) {
          return { entry: null, error: `Entry with id ${id} not found` };
        }
        this.server.emit(LibraryEvents.UPDATED, { entry, action: CrudActions.UPDATED });
        return { entry };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.GET_STATS)
  handleGetStats() {
    return handleGatewayRequest({
      logger,
      action: LibraryEvents.GET_STATS,
      defaultResult: { stats: null },
      handler: async () => {
        const stats = this.libraryService.getStats();
        return { stats };
      },
    });
  }

  @SubscribeMessage(LibraryEvents.REMOVE)
  handleRemove(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: LibraryEvents.REMOVE,
      defaultResult: { success: false },
      schema: libraryRemovePayloadSchema,
      payload,
      handler: async parsed => {
        const deleted = this.libraryService.removeEntry(parsed.id);
        if (!deleted) {
          return { success: false, error: `Entry with id ${parsed.id} not found` };
        }
        this.server.emit(LibraryEvents.UPDATED, { id: parsed.id, action: CrudActions.REMOVED });
        return { success: true };
      },
    });
  }
}
