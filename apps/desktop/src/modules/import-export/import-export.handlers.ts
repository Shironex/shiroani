import {
  createLogger,
  CrudActions,
  DiaryEvents,
  exportRequestSchema,
  ImportExportEvents,
  importRequestSchema,
  LibraryEvents,
  type BackendEventPublisher,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { ImportExportService } from './import-export.service';

const logger = createLogger('ImportExportHandlers');

type ImportExportHandlers = Pick<
  BackendHandlers,
  | typeof ImportExportEvents.EXPORT
  | typeof ImportExportEvents.IMPORT
  | typeof ImportExportEvents.CLEAR_ALL
>;

export function createImportExportHandlers(
  importExport: ImportExportService,
  events: BackendEventPublisher
): ImportExportHandlers {
  return {
    [ImportExportEvents.EXPORT]: payload =>
      handleGatewayRequest({
        logger,
        action: ImportExportEvents.EXPORT,
        defaultResult: { data: null, totalExported: 0 },
        schema: exportRequestSchema,
        payload,
        handler: async parsed => {
          const data = importExport.exportData(parsed.type, parsed.ids);
          const totalExported = (data.data.library?.length ?? 0) + (data.data.diary?.length ?? 0);
          return { data, totalExported };
        },
      }),

    [ImportExportEvents.IMPORT]: payload =>
      handleGatewayRequest({
        logger,
        action: ImportExportEvents.IMPORT,
        defaultResult: { results: [], totalImported: 0, totalSkipped: 0, totalErrors: 0 },
        schema: importRequestSchema,
        payload,
        handler: async parsed => {
          const { response, hasLibrary, hasDiary } = await importExport.importBatch(
            parsed,
            result => events.emit(ImportExportEvents.IMPORT_PROGRESS, result)
          );

          // Tell the stores to refetch.
          if (hasLibrary) {
            events.emit(LibraryEvents.UPDATED, { action: CrudActions.IMPORTED });
          }
          if (hasDiary) {
            events.emit(DiaryEvents.UPDATED, { action: CrudActions.IMPORTED });
          }

          return response;
        },
      }),

    [ImportExportEvents.CLEAR_ALL]: () =>
      handleGatewayRequest({
        logger,
        action: ImportExportEvents.CLEAR_ALL,
        defaultResult: { success: false },
        handler: async () => {
          importExport.clearAllData();
          // No update broadcasts: the renderer relaunches right after a successful
          // wipe, and a refetch would flash empty states before the process exits.
          return { success: true };
        },
      }),
  };
}
