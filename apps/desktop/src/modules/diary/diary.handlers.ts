import {
  createLogger,
  CrudActions,
  DiaryEvents,
  diaryCreatePayloadSchema,
  diaryRemovePayloadSchema,
  diaryUpdatePayloadSchema,
  type BackendEventPublisher,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { DiaryService } from './diary.service';

const logger = createLogger('DiaryHandlers');

type DiaryHandlers = Pick<
  BackendHandlers,
  | typeof DiaryEvents.GET_ALL
  | typeof DiaryEvents.CREATE
  | typeof DiaryEvents.UPDATE
  | typeof DiaryEvents.REMOVE
>;

export function createDiaryHandlers(
  diary: DiaryService,
  events: BackendEventPublisher
): DiaryHandlers {
  return {
    [DiaryEvents.GET_ALL]: () =>
      handleGatewayRequest({
        logger,
        action: DiaryEvents.GET_ALL,
        defaultResult: { entries: [] },
        handler: async () => ({ entries: diary.getAllEntries() }),
      }),

    [DiaryEvents.CREATE]: payload =>
      handleGatewayRequest({
        logger,
        action: DiaryEvents.CREATE,
        defaultResult: { entry: null },
        schema: diaryCreatePayloadSchema,
        payload,
        handler: async parsed => {
          const entry = diary.createEntry(parsed);
          events.emit(DiaryEvents.UPDATED, { entry, action: CrudActions.CREATED });
          return { entry };
        },
      }),

    [DiaryEvents.UPDATE]: payload =>
      handleGatewayRequest({
        logger,
        action: DiaryEvents.UPDATE,
        defaultResult: { entry: null },
        schema: diaryUpdatePayloadSchema,
        payload,
        handler: async parsed => {
          const { id, ...updates } = parsed;
          const entry = diary.updateEntry(id, updates);
          if (!entry) {
            return { entry: null, error: `Entry with id ${id} not found` };
          }
          events.emit(DiaryEvents.UPDATED, { entry, action: CrudActions.UPDATED });
          return { entry };
        },
      }),

    [DiaryEvents.REMOVE]: payload =>
      handleGatewayRequest({
        logger,
        action: DiaryEvents.REMOVE,
        defaultResult: { success: false },
        schema: diaryRemovePayloadSchema,
        payload,
        handler: async parsed => {
          const deleted = diary.removeEntry(parsed.id);
          if (!deleted) {
            return { success: false, error: `Entry with id ${parsed.id} not found` };
          }
          events.emit(DiaryEvents.UPDATED, { id: parsed.id, action: CrudActions.REMOVED });
          return { success: true };
        },
      }),
  };
}
