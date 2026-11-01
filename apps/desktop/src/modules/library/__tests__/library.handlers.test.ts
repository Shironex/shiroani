/**
 * Producer contract of the library handlers. A bulk request broadcasts one event
 * carrying the affected set, and nothing when nothing changed, so listeners never
 * reconcile against an empty set. An invalid payload never reaches the service.
 */

import { LibraryEvents, CrudActions } from '@shiroani/shared';
import { createLibraryHandlers } from '../library.handlers';

const ENTRY = { id: 1, title: 'a', status: 'watching' };

function build() {
  const library = {
    getAllEntries: jest.fn(() => [ENTRY]),
    addEntry: jest.fn(() => ENTRY),
    updateEntry: jest.fn(() => ENTRY),
    updateMany: jest.fn(() => [] as unknown[]),
    getStats: jest.fn(() => ({ total: 1 })),
    removeEntry: jest.fn(() => true),
    removeMany: jest.fn(() => [] as number[]),
  };
  const emit = jest.fn();
  return { library, emit, handlers: createLibraryHandlers(library as never, { emit }) };
}

describe('library handlers', () => {
  describe('get all and stats', () => {
    it('filters by status when given one', async () => {
      const { handlers, library, emit } = build();

      await expect(handlers[LibraryEvents.GET_ALL]({ status: 'watching' })).resolves.toEqual({
        entries: [ENTRY],
      });

      expect(library.getAllEntries).toHaveBeenCalledWith('watching');
      expect(emit).not.toHaveBeenCalled();
    });

    it('accepts the empty object the renderer sends', async () => {
      const { handlers, library } = build();

      await handlers[LibraryEvents.GET_ALL]({});

      expect(library.getAllEntries).toHaveBeenCalledWith(undefined);
    });

    it('returns the stats', async () => {
      const { handlers } = build();
      await expect(handlers[LibraryEvents.GET_STATS](undefined)).resolves.toEqual({
        stats: { total: 1 },
      });
    });
  });

  describe('add', () => {
    it('adds and broadcasts the new entry', async () => {
      const { handlers, emit } = build();

      await expect(
        handlers[LibraryEvents.ADD]({ title: 'a', status: 'watching' })
      ).resolves.toEqual({ entry: ENTRY });

      expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, {
        entry: ENTRY,
        action: CrudActions.ADDED,
      });
    });

    it('returns default plus error when the service throws, without broadcasting', async () => {
      const { handlers, library, emit } = build();
      library.addEntry.mockImplementation(() => {
        throw new Error('disk full');
      });

      await expect(
        handlers[LibraryEvents.ADD]({ title: 'a', status: 'watching' })
      ).resolves.toEqual({ entry: null, error: 'disk full' });
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates and broadcasts, separating the id from the changes', async () => {
      const { handlers, library, emit } = build();

      await handlers[LibraryEvents.UPDATE]({ id: 1, status: 'completed' });

      expect(library.updateEntry).toHaveBeenCalledWith(1, { status: 'completed' });
      expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, {
        entry: ENTRY,
        action: CrudActions.UPDATED,
      });
    });

    it('accepts an undefined key, which structured clone keeps and JSON dropped', async () => {
      const { handlers, library } = build();

      const result = await handlers[LibraryEvents.UPDATE]({
        id: 1,
        status: 'completed',
        score: undefined,
      });

      expect(result.error).toBeUndefined();
      expect(library.updateEntry).toHaveBeenCalledTimes(1);
    });

    it('reports a missing entry in the envelope, without broadcasting', async () => {
      const { handlers, library, emit } = build();
      library.updateEntry.mockReturnValue(undefined as never);

      await expect(handlers[LibraryEvents.UPDATE]({ id: 9, status: 'completed' })).resolves.toEqual(
        { entry: null, error: 'Entry with id 9 not found' }
      );
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes and broadcasts the id', async () => {
      const { handlers, emit } = build();

      await expect(handlers[LibraryEvents.REMOVE]({ id: 1 })).resolves.toEqual({ success: true });

      expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, {
        id: 1,
        action: CrudActions.REMOVED,
      });
    });

    it('reports a missing entry in the envelope, without broadcasting', async () => {
      const { handlers, library, emit } = build();
      library.removeEntry.mockReturnValue(false);

      await expect(handlers[LibraryEvents.REMOVE]({ id: 9 })).resolves.toEqual({
        success: false,
        error: 'Entry with id 9 not found',
      });
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('remove many', () => {
    it('broadcasts REMOVED_MANY once with the ids actually deleted', async () => {
      const { handlers, library, emit } = build();
      library.removeMany.mockReturnValue([1, 2]);

      const result = await handlers[LibraryEvents.REMOVE_MANY]({ ids: [1, 2, 3] });

      expect(library.removeMany).toHaveBeenCalledWith([1, 2, 3]);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, {
        ids: [1, 2],
        action: CrudActions.REMOVED_MANY,
      });
      expect(result).toEqual({ ids: [1, 2] });
    });

    it('does not broadcast when nothing was deleted', async () => {
      const { handlers, emit } = build();

      await expect(handlers[LibraryEvents.REMOVE_MANY]({ ids: [99] })).resolves.toEqual({
        ids: [],
      });
      expect(emit).not.toHaveBeenCalled();
    });

    it('rejects an empty id list without touching the service', async () => {
      const { handlers, library } = build();

      const result = await handlers[LibraryEvents.REMOVE_MANY]({ ids: [] });

      expect(library.removeMany).not.toHaveBeenCalled();
      expect(result.ids).toEqual([]);
      expect(result.error).toBeDefined();
    });
  });

  describe('update many', () => {
    it('broadcasts UPDATED_MANY once with the changed entries', async () => {
      const { handlers, library, emit } = build();
      const entries = [{ id: 1 }, { id: 2 }];
      library.updateMany.mockReturnValue(entries);

      const result = await handlers[LibraryEvents.UPDATE_MANY]({
        ids: [1, 2],
        status: 'completed',
      });

      expect(library.updateMany).toHaveBeenCalledWith([1, 2], { status: 'completed' });
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, {
        entries,
        action: CrudActions.UPDATED_MANY,
      });
      expect(result).toEqual({ entries });
    });

    it('does not broadcast when no row changed', async () => {
      const { handlers, emit } = build();

      await expect(
        handlers[LibraryEvents.UPDATE_MANY]({ ids: [1], status: 'completed' })
      ).resolves.toEqual({ entries: [] });
      expect(emit).not.toHaveBeenCalled();
    });

    it('rejects an ids-only payload without touching the service', async () => {
      const { handlers, library } = build();

      const result = await handlers[LibraryEvents.UPDATE_MANY]({ ids: [1, 2] });

      expect(library.updateMany).not.toHaveBeenCalled();
      expect(result.error).toBeDefined();
    });
  });

  it('returns a response that survives structured clone like it survived JSON', async () => {
    const { handlers, library } = build();
    library.getAllEntries.mockReturnValue([{ ...ENTRY, score: undefined, notes: undefined }]);

    const result = await handlers[LibraryEvents.GET_ALL]({});

    expect(structuredClone(result)).toEqual(JSON.parse(JSON.stringify(result)));
  });
});
