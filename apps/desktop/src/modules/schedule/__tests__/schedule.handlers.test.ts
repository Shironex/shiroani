import { ScheduleEvents } from '@shiroani/shared';
import { createScheduleHandlers } from '../schedule.handlers';

function build() {
  const schedule = {
    getDaily: jest.fn(async (date: string) => ({ date, entries: [] as unknown[] })),
    getWeekly: jest.fn(async () => ({ schedule: { '2026-11-02': [] as unknown[] } })),
  };
  return { schedule, handlers: createScheduleHandlers(schedule as never) };
}

describe('schedule handlers', () => {
  it('returns the day from the response, which is its only delivery path', async () => {
    const { handlers } = build();
    await expect(handlers[ScheduleEvents.GET_DAILY]({ date: '2026-11-02' })).resolves.toEqual({
      date: '2026-11-02',
      entries: [],
    });
  });

  it('returns the week from the response', async () => {
    const { handlers, schedule } = build();
    await expect(handlers[ScheduleEvents.GET_WEEKLY]({ startDate: '2026-11-02' })).resolves.toEqual(
      { schedule: { '2026-11-02': [] } }
    );
    expect(schedule.getWeekly).toHaveBeenCalledWith('2026-11-02');
  });

  it('passes a failure reported by the service through the envelope', async () => {
    const { handlers, schedule } = build();
    schedule.getDaily.mockResolvedValue({
      date: '2026-11-02',
      entries: [],
      error: 'offline',
    } as never);
    await expect(handlers[ScheduleEvents.GET_DAILY]({ date: '2026-11-02' })).resolves.toMatchObject(
      {
        error: 'offline',
      }
    );
  });

  it('never reaches the service with an invalid payload', async () => {
    const { handlers, schedule } = build();
    const result = await handlers[ScheduleEvents.GET_DAILY]({ date: 7 });
    expect(typeof result.error).toBe('string');
    expect(schedule.getDaily).not.toHaveBeenCalled();
  });

  it('returns default plus error when the service throws', async () => {
    const { handlers, schedule } = build();
    schedule.getWeekly.mockRejectedValue(new Error('boom'));
    await expect(handlers[ScheduleEvents.GET_WEEKLY]({ startDate: '2026-11-02' })).resolves.toEqual(
      { schedule: {}, error: 'boom' }
    );
  });

  it('returns a response that survives structured clone like it survived JSON', async () => {
    const { handlers, schedule } = build();
    schedule.getDaily.mockResolvedValue({
      date: '2026-11-02',
      entries: [{ id: 1, media: { title: { romaji: 'a', english: null, native: undefined } } }],
    });
    const result = await handlers[ScheduleEvents.GET_DAILY]({ date: '2026-11-02' });
    expect(structuredClone(result)).toEqual(JSON.parse(JSON.stringify(result)));
  });
});
