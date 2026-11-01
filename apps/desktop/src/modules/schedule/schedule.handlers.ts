import {
  createLogger,
  ScheduleEvents,
  scheduleGetDailyPayloadSchema,
  scheduleGetWeeklyPayloadSchema,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { ScheduleService } from './schedule.service';

const logger = createLogger('ScheduleHandlers');

type ScheduleHandlers = Pick<
  BackendHandlers,
  typeof ScheduleEvents.GET_DAILY | typeof ScheduleEvents.GET_WEEKLY
>;

export function createScheduleHandlers(schedule: ScheduleService): ScheduleHandlers {
  return {
    [ScheduleEvents.GET_DAILY]: payload =>
      handleGatewayRequest({
        logger,
        action: ScheduleEvents.GET_DAILY,
        defaultResult: { date: '', entries: [] },
        schema: scheduleGetDailyPayloadSchema,
        payload,
        handler: parsed => schedule.getDaily(parsed.date),
      }),

    [ScheduleEvents.GET_WEEKLY]: payload =>
      handleGatewayRequest({
        logger,
        action: ScheduleEvents.GET_WEEKLY,
        defaultResult: { schedule: {} },
        schema: scheduleGetWeeklyPayloadSchema,
        payload,
        handler: parsed => schedule.getWeekly(parsed.startDate),
      }),
  };
}
