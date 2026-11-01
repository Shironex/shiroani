import { AniListSyncEvents, CrudActions, LibraryEvents, MalSyncEvents } from '@shiroani/shared';
import { createMalSyncHandlers } from '../../mal-sync/mal-sync.handlers';
import { createAniListSyncHandlers } from '../anilist-sync.handlers';

const TALLY = {
  imported: 0,
  pushedNew: 0,
  updatedLocal: 0,
  updatedRemote: 0,
  unchanged: 0,
  conflicts: 0,
  skippedNoId: 0,
  errors: 0,
};
const IMPORTED = { action: CrudActions.IMPORTED };

const PROVIDERS = [
  {
    name: 'AniList',
    create: createAniListSyncHandlers,
    SYNC: AniListSyncEvents.SYNC,
    SYNC_ENTRY: AniListSyncEvents.SYNC_ENTRY,
    PROGRESS: AniListSyncEvents.PROGRESS,
  },
  {
    name: 'MAL',
    create: createMalSyncHandlers,
    SYNC: MalSyncEvents.SYNC,
    SYNC_ENTRY: MalSyncEvents.SYNC_ENTRY,
    PROGRESS: MalSyncEvents.PROGRESS,
  },
] as const;

describe.each(PROVIDERS)('$name sync handlers', ({ create, SYNC, SYNC_ENTRY, PROGRESS }) => {
  function build() {
    const service = {
      sync: jest.fn(async (_onProgress: (p: unknown) => void, _request: unknown) => TALLY),
      syncEntry: jest.fn(async () => ({ action: 'updated' })),
    };
    const emit = jest.fn();
    // One cast covers both providers: each handler set takes its own service type.
    const handlers = (create as (s: never, e: { emit: jest.Mock }) => Record<string, never>)(
      service as never,
      { emit }
    ) as unknown as Record<string, (payload: unknown) => Promise<Record<string, unknown>>>;
    return { service, emit, handlers };
  }

  describe('full sync', () => {
    it('defaults a missing payload to two-way', async () => {
      const { handlers, service } = build();

      await expect(handlers[SYNC](undefined)).resolves.toEqual(TALLY);

      expect(service.sync.mock.calls[0][1]).toEqual({ direction: 'two-way' });
    });

    it('accepts an undefined pushMode key, which structured clone keeps', async () => {
      const { handlers, service } = build();

      const result = await handlers[SYNC]({ direction: 'pull', pushMode: undefined });

      expect(result.error).toBeUndefined();
      expect(service.sync).toHaveBeenCalledTimes(1);
    });

    it('rejects a push with no pushMode and unknown keys, without running', async () => {
      const { handlers, service } = build();

      const noMode = await handlers[SYNC]({ direction: 'push' });
      const extra = await handlers[SYNC]({ direction: 'pull', token: 'x' });

      expect(typeof noMode.error).toBe('string');
      expect(typeof extra.error).toBe('string');
      expect(service.sync).not.toHaveBeenCalled();
    });

    it('publishes progress on its own channel', async () => {
      const { handlers, service, emit } = build();
      service.sync.mockImplementation(async onProgress => {
        onProgress({ current: 1 });
        return TALLY;
      });

      await handlers[SYNC](undefined);

      expect(emit).toHaveBeenCalledWith(PROGRESS, { current: 1 });
    });

    it.each([
      ['an import', { imported: 1 }, true],
      ['a local update', { updatedLocal: 1 }, true],
      ['a push-only run', { pushedNew: 3, updatedRemote: 2 }, false],
    ])('after %s, broadcasts only if the library changed', async (_label, counts, broadcast) => {
      const { handlers, service, emit } = build();
      service.sync.mockResolvedValue({ ...TALLY, ...counts });

      await handlers[SYNC](undefined);

      expect(emit.mock.calls.some(([event]) => event === LibraryEvents.UPDATED)).toBe(broadcast);
    });

    it('returns the zeroed tally plus error when the run is refused', async () => {
      const { handlers, service, emit } = build();
      service.sync.mockRejectedValue(new Error('Sync already in progress'));

      await expect(handlers[SYNC](undefined)).resolves.toEqual({
        ...TALLY,
        error: 'Sync already in progress',
      });
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('single entry', () => {
    it.each(['pushed', 'updated', 'unchanged'])('broadcasts after %s', async action => {
      const { handlers, service, emit } = build();
      service.syncEntry.mockResolvedValue({ action });

      await expect(handlers[SYNC_ENTRY]({ localId: 1, direction: 'auto' })).resolves.toEqual({
        action,
      });

      expect(service.syncEntry).toHaveBeenCalledWith(1, 'auto');
      expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, IMPORTED);
    });

    it('does not broadcast when skipped', async () => {
      const { handlers, service, emit } = build();
      service.syncEntry.mockResolvedValue({ action: 'skipped' });

      await handlers[SYNC_ENTRY]({ localId: 1, direction: 'auto' });

      expect(emit).not.toHaveBeenCalled();
    });

    it('reports a failure as the error action', async () => {
      const { handlers, service, emit } = build();
      service.syncEntry.mockRejectedValue(new Error('Sync already in progress'));

      await expect(handlers[SYNC_ENTRY]({ localId: 1, direction: 'auto' })).resolves.toEqual({
        action: 'error',
        error: 'Sync already in progress',
      });
      expect(emit).not.toHaveBeenCalled();
    });

    it('never reaches the service with an invalid payload', async () => {
      const { handlers, service } = build();

      const result = await handlers[SYNC_ENTRY]({ localId: 'x', direction: 'auto' });

      expect(result.action).toBe('error');
      expect(service.syncEntry).not.toHaveBeenCalled();
    });
  });
});
