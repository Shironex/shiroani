import {
  AniListSyncService,
  SYNC_IN_PROGRESS_ERROR,
  SYNC_NOT_CONNECTED_ERROR,
} from '../anilist-sync.service';
import type { AniListMediaListEntry } from '../../anime/types';
import type { AniListSyncRow } from '../../library/library.types';
import type { AniListSyncProgress } from '@shiroani/shared';

type ClientMock = {
  getViewer: jest.Mock;
  getMediaListCollection: jest.Mock;
  saveMediaListEntry: jest.Mock;
};
type LibraryMock = {
  getEntriesForSync: jest.Mock;
  getEntryById: jest.Mock;
  addEntry: jest.Mock;
  updateEntry: jest.Mock;
  markAniListSync: jest.Mock;
};
type TokenMock = { getAccessToken: jest.Mock };

const EPOCH = Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000);

function makeService(opts: {
  remote?: AniListMediaListEntry[];
  local?: AniListSyncRow[];
  token?: string | null;
}) {
  const client: ClientMock = {
    getViewer: jest.fn().mockResolvedValue({ id: 7, name: 'Anya' }),
    getMediaListCollection: jest.fn().mockResolvedValue(opts.remote ?? []),
    saveMediaListEntry: jest.fn().mockResolvedValue(EPOCH + 100),
  };
  const library: LibraryMock = {
    getEntriesForSync: jest.fn().mockReturnValue(opts.local ?? []),
    // Default: the optimistic re-read returns nothing (treated as "proceed"); a
    // test overrides this to simulate a concurrent edit.
    getEntryById: jest.fn().mockReturnValue(undefined),
    addEntry: jest.fn().mockReturnValue({ id: 999 }),
    updateEntry: jest.fn(),
    markAniListSync: jest.fn(),
  };
  const tokenPort: TokenMock = {
    getAccessToken: jest.fn().mockResolvedValue(opts.token === undefined ? 'tok' : opts.token),
  };
  const service = new AniListSyncService(client as never, library as never, tokenPort as never);
  return { service, client, library, tokenPort };
}

const noop = (): void => {};

function remote(o: Partial<AniListMediaListEntry> = {}): AniListMediaListEntry {
  return {
    mediaId: 100,
    status: 'CURRENT',
    progress: 1,
    score: null,
    notes: null,
    updatedAt: EPOCH,
    title: 'Remote Show',
    ...o,
  };
}

function local(o: Partial<AniListSyncRow> = {}): AniListSyncRow {
  return {
    id: 1,
    anilistId: 100,
    title: 'Local Show',
    status: 'watching',
    currentEpisode: 1,
    score: null,
    notes: null,
    updatedAt: '2024-01-01 00:00:00',
    anilistSyncedAt: '2024-01-01 00:00:00',
    anilistRemoteUpdatedAt: EPOCH,
    ...o,
  };
}

describe('AniListSyncService.sync', () => {
  it('throws when no AniList account is connected', async () => {
    const { service, client } = makeService({ token: null });
    await expect(service.sync(noop)).rejects.toThrow(SYNC_NOT_CONNECTED_ERROR);
    expect(client.getMediaListCollection).not.toHaveBeenCalled();
  });

  it('enforces single-flight: a concurrent sync is rejected', async () => {
    const { service } = makeService({ remote: [], local: [] });
    const first = service.sync(noop);
    await expect(service.sync(noop)).rejects.toThrow(SYNC_IN_PROGRESS_ERROR);
    await first;
    // The slot is released after the first run — a later sync succeeds.
    await expect(service.sync(noop)).resolves.toBeDefined();
  });

  it('imports a remote-only entry and stamps the sync baseline', async () => {
    const { service, library } = makeService({
      remote: [remote({ mediaId: 100, score: 85, notes: 'great' })],
      local: [],
    });
    const result = await service.sync(noop);
    expect(library.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ anilistId: 100, score: 8.5, notes: 'great' })
    );
    expect(library.markAniListSync).toHaveBeenCalledWith(999, EPOCH);
    expect(result.imported).toBe(1);
  });

  it('pushes a local-only entry to AniList and records the returned updatedAt baseline', async () => {
    const { service, client, library } = makeService({
      remote: [],
      local: [local({ id: 5, anilistId: 200, status: 'completed', currentEpisode: 12 })],
    });
    const result = await service.sync(noop);
    expect(client.saveMediaListEntry).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 200, status: 'COMPLETED', progress: 12 })
    );
    // Baseline uses the server-returned updatedAt (EPOCH+100), not the local clock.
    expect(library.markAniListSync).toHaveBeenCalledWith(5, EPOCH + 100);
    expect(result.pushedNew).toBe(1);
  });

  it('skips local entries without an AniList id', async () => {
    const { service, client, library } = makeService({
      remote: [],
      local: [local({ id: 9, anilistId: null })],
    });
    const result = await service.sync(noop);
    expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    expect(library.markAniListSync).not.toHaveBeenCalled();
    expect(result.skippedNoId).toBe(1);
  });

  it('reconciles a match: pushes the higher local progress and re-baselines from the push response', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 3, updatedAt: EPOCH })],
      local: [
        local({
          id: 1,
          anilistId: 100,
          currentEpisode: 8,
          updatedAt: '2024-06-01 00:00:00',
          anilistSyncedAt: '2024-01-01 00:00:00',
          anilistRemoteUpdatedAt: EPOCH,
        }),
      ],
    });
    const result = await service.sync(noop);
    expect(client.saveMediaListEntry).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 100, progress: 8 })
    );
    expect(library.markAniListSync).toHaveBeenCalledWith(1, EPOCH + 100);
    expect(result.updatedRemote).toBe(1);
  });

  it('counts an unchanged match without writing', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 5, status: 'CURRENT' })],
      local: [local({ anilistId: 100, currentEpisode: 5, status: 'watching' })],
    });
    const result = await service.sync(noop);
    expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    expect(library.updateEntry).not.toHaveBeenCalled();
    // Baseline is still refreshed even for unchanged entries.
    expect(library.markAniListSync).toHaveBeenCalledWith(1, EPOCH);
    expect(result.unchanged).toBe(1);
  });

  it('isolates a per-entry failure: one bad entry does not abort the run', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 9, status: 'CURRENT' })],
      local: [
        local({
          id: 1,
          anilistId: 100,
          currentEpisode: 9,
          status: 'completed',
          updatedAt: '2024-06-01 00:00:00',
          anilistSyncedAt: '2024-01-01 00:00:00',
        }),
        local({ id: 2, anilistId: 300, status: 'watching' }), // local-only → push
      ],
    });
    // First write (the reconcile push for id=1) throws; the local-only push (id=2) succeeds.
    client.saveMediaListEntry
      .mockRejectedValueOnce(new Error('429 rate limited'))
      .mockResolvedValueOnce(EPOCH + 50);

    const result = await service.sync(noop);
    expect(result.errors).toBe(1);
    expect(result.pushedNew).toBe(1);
    // The failed entry was NOT re-baselined; the successful one was.
    expect(library.markAniListSync).toHaveBeenCalledWith(2, EPOCH + 50);
    expect(library.markAniListSync).not.toHaveBeenCalledWith(1, expect.anything());
  });

  it('dedups a media that AniList returns in multiple lists (same mediaId)', async () => {
    // A media in a custom list comes back once per list with the same mediaId.
    const { service, library } = makeService({
      remote: [
        remote({ mediaId: 100, title: 'Dup', updatedAt: EPOCH }),
        remote({ mediaId: 100, title: 'Dup', updatedAt: EPOCH + 5 }),
      ],
      local: [],
    });
    const result = await service.sync(noop);
    // Imported exactly once — no second addEntry that would hit the UNIQUE constraint.
    expect(library.addEntry).toHaveBeenCalledTimes(1);
    expect(result.imported).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('skips an entry that was edited locally mid-sync (optimistic concurrency guard)', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 9 })],
      local: [
        local({ id: 1, anilistId: 100, currentEpisode: 5, updatedAt: '2024-01-01 00:00:00' }),
      ],
    });
    // The row changed since the snapshot — re-read reports a newer updatedAt.
    library.getEntryById.mockReturnValue({ id: 1, updatedAt: '2099-01-01 00:00:00' });

    await service.sync(noop);
    expect(library.updateEntry).not.toHaveBeenCalled();
    expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    expect(library.markAniListSync).not.toHaveBeenCalled();
  });

  it('emits per-entry progress with a running total', async () => {
    const { service } = makeService({
      remote: [remote({ mediaId: 100 }), remote({ mediaId: 101, title: 'Second' })],
      local: [],
    });
    const events: AniListSyncProgress[] = [];
    await service.sync(p => events.push(p));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ current: 1, total: 2, action: 'imported' });
    expect(events[1]).toMatchObject({ current: 2, total: 2 });
  });
});
