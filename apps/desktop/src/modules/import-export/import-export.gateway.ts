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
  ImportExportEvents,
  LibraryEvents,
  DiaryEvents,
  CrudActions,
  exportRequestSchema,
  importRequestSchema,
  type ExportResponse,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { ImportExportService } from './import-export.service';

const logger = createLogger('ImportExportGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class ImportExportGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly importExportService: ImportExportService) {
    logger.info('ImportExportGateway initialized');
  }

  @SubscribeMessage(ImportExportEvents.EXPORT)
  handleExport(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: ImportExportEvents.EXPORT,
      defaultResult: { data: null, totalExported: 0 },
      schema: exportRequestSchema,
      payload,
      handler: async parsed => {
        const data = this.importExportService.exportData(parsed.type, parsed.ids);
        const totalExported = (data.data.library?.length ?? 0) + (data.data.diary?.length ?? 0);
        return { data, totalExported } as ExportResponse;
      },
    });
  }

  @SubscribeMessage(ImportExportEvents.IMPORT)
  handleImport(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: ImportExportEvents.IMPORT,
      defaultResult: { results: [], totalImported: 0, totalSkipped: 0, totalErrors: 0 },
      schema: importRequestSchema,
      payload,
      handler: async parsed => {
        const { response, hasLibrary, hasDiary } = await this.importExportService.importBatch(
          parsed,
          result => this.server.emit(ImportExportEvents.IMPORT_PROGRESS, result)
        );

        // Notify existing stores to refresh
        if (hasLibrary) {
          this.server.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
        }
        if (hasDiary) {
          this.server.emit(DiaryEvents.UPDATED, { action: CrudActions.IMPORTED });
        }

        return response;
      },
    });
  }
}
