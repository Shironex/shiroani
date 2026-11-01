import {
  createLogger,
  CrudActions,
  LibraryEvents,
  libraryAddPayloadSchema,
  libraryGetAllPayloadSchema,
  libraryRemoveManyPayloadSchema,
  libraryRemovePayloadSchema,
  libraryUpdateManyPayloadSchema,
  libraryUpdatePayloadSchema,
  type BackendEventPublisher,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { LibraryService } from './library.service';

const logger = createLogger('LibraryHandlers');

type LibraryHandlers = Pick<
  BackendHandlers,
  | typeof LibraryEvents.GET_ALL
  | typeof LibraryEvents.ADD
  | typeof LibraryEvents.UPDATE
  | typeof LibraryEvents.UPDATE_MANY
  | typeof LibraryEvents.GET_STATS
  | typeof LibraryEvents.REMOVE
  | typeof LibraryEvents.REMOVE_MANY
>;

export function createLibraryHandlers(
  library: LibraryService,
  events: BackendEventPublisher
): LibraryHandlers {
  return {
    [LibraryEvents.GET_ALL]: payload =>
      handleGatewayRequest({
        logger,
        action: LibraryEvents.GET_ALL,
        defaultResult: { entries: [] },
        schema: libraryGetAllPayloadSchema,
        payload,
        handler: async parsed => ({ entries: library.getAllEntries(parsed?.status) }),
      }),

    [LibraryEvents.ADD]: payload =>
      handleGatewayRequest({
        logger,
        action: LibraryEvents.ADD,
        defaultResult: { entry: null },
        schema: libraryAddPayloadSchema,
        payload,
        handler: async parsed => {
          const entry = library.addEntry(parsed);
          events.emit(LibraryEvents.UPDATED, { entry, action: CrudActions.ADDED });
          return { entry };
        },
      }),

    [LibraryEvents.UPDATE]: payload =>
      handleGatewayRequest({
        logger,
        action: LibraryEvents.UPDATE,
        defaultResult: { entry: null },
        schema: libraryUpdatePayloadSchema,
        payload,
        handler: async parsed => {
          const { id, ...updates } = parsed;
          const entry = library.updateEntry(id, updates);
          if (!entry) {
            return { entry: null, error: `Entry with id ${id} not found` };
          }
          events.emit(LibraryEvents.UPDATED, { entry, action: CrudActions.UPDATED });
          return { entry };
        },
      }),

    [LibraryEvents.UPDATE_MANY]: payload =>
      handleGatewayRequest({
        logger,
        action: LibraryEvents.UPDATE_MANY,
        defaultResult: { entries: [] },
        schema: libraryUpdateManyPayloadSchema,
        payload,
        handler: async parsed => {
          const { ids, ...updates } = parsed;
          const entries = library.updateMany(ids, updates);
          // Only broadcast when a row changed, so listeners never reconcile
          // against an empty set.
          if (entries.length > 0) {
            events.emit(LibraryEvents.UPDATED, { entries, action: CrudActions.UPDATED_MANY });
          }
          return { entries };
        },
      }),

    [LibraryEvents.GET_STATS]: () =>
      handleGatewayRequest({
        logger,
        action: LibraryEvents.GET_STATS,
        defaultResult: { stats: null },
        handler: async () => ({ stats: library.getStats() }),
      }),

    [LibraryEvents.REMOVE]: payload =>
      handleGatewayRequest({
        logger,
        action: LibraryEvents.REMOVE,
        defaultResult: { success: false },
        schema: libraryRemovePayloadSchema,
        payload,
        handler: async parsed => {
          const deleted = library.removeEntry(parsed.id);
          if (!deleted) {
            return { success: false, error: `Entry with id ${parsed.id} not found` };
          }
          events.emit(LibraryEvents.UPDATED, { id: parsed.id, action: CrudActions.REMOVED });
          return { success: true };
        },
      }),

    [LibraryEvents.REMOVE_MANY]: payload =>
      handleGatewayRequest({
        logger,
        action: LibraryEvents.REMOVE_MANY,
        defaultResult: { ids: [] },
        schema: libraryRemoveManyPayloadSchema,
        payload,
        handler: async parsed => {
          const ids = library.removeMany(parsed.ids);
          // Broadcast the rows actually deleted, so listeners prune the same set.
          if (ids.length > 0) {
            events.emit(LibraryEvents.UPDATED, { ids, action: CrudActions.REMOVED_MANY });
          }
          return { ids };
        },
      }),
  };
}
