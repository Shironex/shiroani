import { CrudActions, DiaryEvents } from '@shiroani/shared';
import { createDiaryHandlers } from '../diary.handlers';

const ENTRY = { id: 1, title: 'a', contentJson: '{}', isPinned: false };
const VALID_CREATE = { title: 'a', contentJson: '{}' };

function build() {
  const diary = {
    getAllEntries: jest.fn(() => [ENTRY]),
    createEntry: jest.fn(() => ENTRY),
    updateEntry: jest.fn(() => ENTRY),
    removeEntry: jest.fn(() => true),
  };
  const events = { emit: jest.fn() };
  return { diary, events, handlers: createDiaryHandlers(diary as never, events) };
}

describe('diary handlers', () => {
  it('returns all entries without broadcasting', async () => {
    const { handlers, events } = build();
    await expect(handlers[DiaryEvents.GET_ALL](undefined)).resolves.toEqual({ entries: [ENTRY] });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('creates and broadcasts the new entry', async () => {
    const { handlers, diary, events } = build();

    await expect(handlers[DiaryEvents.CREATE](VALID_CREATE)).resolves.toEqual({ entry: ENTRY });

    expect(diary.createEntry).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith(DiaryEvents.UPDATED, {
      entry: ENTRY,
      action: CrudActions.CREATED,
    });
  });

  it('updates and broadcasts, separating the id from the changes', async () => {
    const { handlers, diary, events } = build();

    await handlers[DiaryEvents.UPDATE]({ id: 1, title: 'b' });

    expect(diary.updateEntry).toHaveBeenCalledWith(1, { title: 'b' });
    expect(events.emit).toHaveBeenCalledWith(DiaryEvents.UPDATED, {
      entry: ENTRY,
      action: CrudActions.UPDATED,
    });
  });

  it('reports an update of a missing entry in the envelope, without broadcasting', async () => {
    const { handlers, diary, events } = build();
    diary.updateEntry.mockReturnValue(null as never);

    await expect(handlers[DiaryEvents.UPDATE]({ id: 9, title: 'b' })).resolves.toEqual({
      entry: null,
      error: 'Entry with id 9 not found',
    });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('removes and broadcasts the id', async () => {
    const { handlers, events } = build();

    await expect(handlers[DiaryEvents.REMOVE]({ id: 1 })).resolves.toEqual({ success: true });

    expect(events.emit).toHaveBeenCalledWith(DiaryEvents.UPDATED, {
      id: 1,
      action: CrudActions.REMOVED,
    });
  });

  it('reports a remove of a missing entry in the envelope, without broadcasting', async () => {
    const { handlers, diary, events } = build();
    diary.removeEntry.mockReturnValue(false);

    await expect(handlers[DiaryEvents.REMOVE]({ id: 9 })).resolves.toEqual({
      success: false,
      error: 'Entry with id 9 not found',
    });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('never reaches the service with an invalid payload', async () => {
    const { handlers, diary } = build();

    const result = await handlers[DiaryEvents.REMOVE]({ id: 'nope' });

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(diary.removeEntry).not.toHaveBeenCalled();
  });

  it('returns default plus error when the service throws, without broadcasting', async () => {
    const { handlers, diary, events } = build();
    diary.createEntry.mockImplementation(() => {
      throw new Error('disk full');
    });

    await expect(handlers[DiaryEvents.CREATE](VALID_CREATE)).resolves.toEqual({
      entry: null,
      error: 'disk full',
    });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('returns a response that survives structured clone like it survived JSON', async () => {
    const { handlers, diary } = build();
    const row = { ...ENTRY, mood: undefined, tags: undefined };
    diary.getAllEntries.mockReturnValue([row]);

    const result = await handlers[DiaryEvents.GET_ALL](undefined);

    expect(structuredClone(result)).toEqual(JSON.parse(JSON.stringify(result)));
  });
});
