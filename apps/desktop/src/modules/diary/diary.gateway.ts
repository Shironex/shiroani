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
  DiaryEvents,
  CrudActions,
  diaryCreatePayloadSchema,
  diaryUpdatePayloadSchema,
  diaryRemovePayloadSchema,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { DiaryService } from './diary.service';

const logger = createLogger('DiaryGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class DiaryGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly diaryService: DiaryService) {
    logger.info('DiaryGateway initialized');
  }

  @SubscribeMessage(DiaryEvents.GET_ALL)
  handleGetAll() {
    return handleGatewayRequest({
      logger,
      action: DiaryEvents.GET_ALL,
      defaultResult: { entries: [] },
      handler: async () => {
        const entries = this.diaryService.getAllEntries();
        return { entries };
      },
    });
  }

  @SubscribeMessage(DiaryEvents.CREATE)
  handleCreate(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: DiaryEvents.CREATE,
      defaultResult: { entry: null },
      schema: diaryCreatePayloadSchema,
      payload,
      handler: async parsed => {
        const entry = this.diaryService.createEntry(parsed);
        this.server.emit(DiaryEvents.UPDATED, { entry, action: CrudActions.CREATED });
        return { entry };
      },
    });
  }

  @SubscribeMessage(DiaryEvents.UPDATE)
  handleUpdate(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: DiaryEvents.UPDATE,
      defaultResult: { entry: null },
      schema: diaryUpdatePayloadSchema,
      payload,
      handler: async parsed => {
        const { id, ...updates } = parsed;
        const entry = this.diaryService.updateEntry(id, updates);
        if (!entry) {
          return { entry: null, error: `Entry with id ${id} not found` };
        }
        this.server.emit(DiaryEvents.UPDATED, { entry, action: CrudActions.UPDATED });
        return { entry };
      },
    });
  }

  @SubscribeMessage(DiaryEvents.REMOVE)
  handleRemove(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: DiaryEvents.REMOVE,
      defaultResult: { success: false },
      schema: diaryRemovePayloadSchema,
      payload,
      handler: async parsed => {
        const deleted = this.diaryService.removeEntry(parsed.id);
        if (!deleted) {
          return { success: false, error: `Entry with id ${parsed.id} not found` };
        }
        this.server.emit(DiaryEvents.UPDATED, { id: parsed.id, action: CrudActions.REMOVED });
        return { success: true };
      },
    });
  }
}
