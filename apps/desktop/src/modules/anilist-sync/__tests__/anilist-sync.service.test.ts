import {
  AniListSyncService,
  SYNC_IN_PROGRESS_ERROR,
  SYNC_NOT_CONNECTED_ERROR,
  SYNC_ENTRY_NOT_FOUND_ERROR,
} from '../anilist-sync.service';
import type { AniListMediaListEntry } from '../../anime/types';
import type { AniListSyncRow } from '../../library/library.types';
import type { AniListSyncProgress } from '@shiroani/shared';

type ClientMock = {
  getViewer: jest.Mock;
  getMediaListCollection: jest.Mock;
  getMediaListEntry: jest.Mock;
  saveMediaListEntry: jest.Mock;
};
type LibraryMock = {
  getEntriesForSync: jest.Mock;
  getSyncRowById: jest.Mock;
  getEntryById: jest.Mock;
  addEntry: jest.Mock;
  updateEntry: jest.Mock;
  markAniListSync: jest.Mock;
  setMalId: jest.Mock;
};
type TokenMock = { getAccessToken: jest.Mock };

const EPOCH = Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000);

function makeService(opts: {
  remote?: AniListMediaListEntry[];
  /** Single-entry remote lookup (getMediaListEntry). undefined → not stubbed. */
  remoteEntry?: AniListMediaListEntry | null;
  local?: AniListSyncRow[];
  token?: string | null;
}) {
  const client: ClientMock = {
    getViewer: jest.fn().mockResolvedValue({ id: 7, name: 'Anya' }),
    getMediaListCollection: jest.fn().mockResolvedValue(opts.remote ?? []),
    getMediaListEntry: jest.fn().mockResolvedValue(opts.remoteEntry ?? null),
    saveMediaListEntry: jest.fn().mockResolvedValue(EPOCH + 100),
  };
  const library: LibraryMock = {
    getEntriesForSync: jest.fn().mockReturnValue(opts.local ?? []),
    // Single-row snapshot used by syncEntry — returns the full AniListSyncRow.
    getSyncRowById: jest.fn((id: number) => (opts.local ?? []).find(r => r.id === id)),
    // Default: the optimistic re-read returns the row unchanged (same updatedAt as
    // the snapshot) so the guard passes through. A test overrides this to return a
    // changed updatedAt (concurrent edit) or undefined (deleted mid-sync).
    getEntryById: jest.fn((id: number) => {
      const row = (opts.local ?? []).find(r => r.id === id);
      return row ? { id, updatedAt: row.updatedAt } : undefined;
    }),
    addEntry: jest.fn().mockReturnValue({ id: 999 }),
    updateEntry: jest.fn(),
    markAniListSync: jest.fn(),
    setMalId: jest.fn(),
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

  it('backfills mal_id from idMal on an unchanged match (links a pre-existing library)', async () => {
    // An already-reconciled row (nothing to sync) still has its MAL cross-ref
    // linked from AniList's idMal — this is what makes a stable library MAL-ready
    // after a single AniList sync, with no MAL title search.
    const { service, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 5, status: 'CURRENT', idMal: 52034 })],
      local: [local({ id: 1, anilistId: 100, malId: null, currentEpisode: 5, status: 'watching' })],
    });
    await service.sync(noop);
    expect(library.setMalId).toHaveBeenCalledWith(1, 52034);
  });

  it('does not relink mal_id when the row is already linked', async () => {
    const { service, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 5, status: 'CURRENT', idMal: 52034 })],
      local: [local({ id: 1, anilistId: 100, malId: 999, currentEpisode: 5, status: 'watching' })],
    });
    await service.sync(noop);
    expect(library.setMalId).not.toHaveBeenCalled();
  });

  it('skips mal_id link when AniList reports no MAL mapping (idMal absent)', async () => {
    const { service, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 5, status: 'CURRENT' })], // no idMal
      local: [local({ id: 1, anilistId: 100, malId: null, currentEpisode: 5, status: 'watching' })],
    });
    await service.sync(noop);
    expect(library.setMalId).not.toHaveBeenCalled();
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

  it('skips an entry that was deleted locally mid-sync (re-read returns undefined)', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 9 })],
      local: [local({ id: 1, anilistId: 100, currentEpisode: 5 })],
    });
    // The row was deleted since the snapshot — re-read finds nothing.
    library.getEntryById.mockReturnValue(undefined);

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

describe('AniListSyncService.sync — push direction (one-way local → AniList)', () => {
  // A mixed library exercised by both push modes: one entry that already exists
  // on AniList, one local-only entry AniList lacks, one entry with no AniList id —
  // plus a remote-only entry that push must NEVER import.
  function mixedService() {
    return makeService({
      remote: [
        remote({ mediaId: 100, title: 'On both sides' }),
        remote({ mediaId: 999, title: 'Remote only — must not import' }),
      ],
      local: [
        local({ id: 1, anilistId: 100, status: 'completed', currentEpisode: 12 }),
        local({ id: 2, anilistId: 200, status: 'watching', currentEpisode: 3 }),
        local({ id: 3, anilistId: null }),
      ],
    });
  }

  it('create-missing: pushes only the entry AniList lacks, leaves the existing match untouched, never imports', async () => {
    const { service, client, library } = mixedService();
    const result = await service.sync(noop, { direction: 'push', pushMode: 'create-missing' });

    // Only the local-only entry (id=2 / mediaId=200) is written to AniList.
    expect(client.saveMediaListEntry).toHaveBeenCalledTimes(1);
    expect(client.saveMediaListEntry).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 200, status: 'CURRENT', progress: 3 })
    );
    // The already-present match (mediaId=100) is deliberately NOT rewritten.
    expect(client.saveMediaListEntry).not.toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 100 })
    );
    // Push never imports remote-only entries into the local library.
    expect(library.addEntry).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      pushedNew: 1,
      updatedRemote: 0,
      imported: 0,
      unchanged: 1,
      skippedNoId: 1,
    });
  });

  it('overwrite: pushes every local entry (creates the missing one AND rewrites the existing one), never imports', async () => {
    const { service, client, library } = mixedService();
    const result = await service.sync(noop, { direction: 'push', pushMode: 'overwrite' });

    // Both the existing match and the local-only entry are written.
    expect(client.saveMediaListEntry).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 100, status: 'COMPLETED', progress: 12 })
    );
    expect(client.saveMediaListEntry).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 200, status: 'CURRENT', progress: 3 })
    );
    expect(client.saveMediaListEntry).toHaveBeenCalledTimes(2);
    expect(library.addEntry).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updatedRemote: 1,
      pushedNew: 1,
      imported: 0,
      skippedNoId: 1,
    });
  });

  it('skips a row edited locally mid-push (optimistic re-read guard)', async () => {
    const { service, client, library } = makeService({
      remote: [],
      local: [local({ id: 2, anilistId: 200, status: 'watching', currentEpisode: 3 })],
    });
    // The row changed since the start-of-run snapshot → don't mirror a stale value.
    library.getEntryById.mockReturnValue({ id: 2, updatedAt: '2099-01-01 00:00:00' });
    const result = await service.sync(noop, { direction: 'push', pushMode: 'overwrite' });
    expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    expect(result.pushedNew).toBe(0);
  });
});

describe('AniListSyncService.sync — pull direction (one-way AniList → local)', () => {
  it('imports remote-only and overwrites matched rows from remote, never pushes or writes remote', async () => {
    const { service, client, library } = makeService({
      remote: [
        remote({
          mediaId: 999,
          title: 'Remote only',
          status: 'COMPLETED',
          progress: 24,
          updatedAt: EPOCH + 10,
        }),
        remote({ mediaId: 100, status: 'COMPLETED', progress: 12, updatedAt: EPOCH + 20 }),
      ],
      local: [
        local({ id: 1, anilistId: 100, status: 'watching', currentEpisode: 2 }),
        local({ id: 2, anilistId: 200, status: 'watching', currentEpisode: 5 }),
      ],
    });
    const result = await service.sync(noop, { direction: 'pull' });

    // Remote-only entry imported locally.
    expect(library.addEntry).toHaveBeenCalledWith(expect.objectContaining({ anilistId: 999 }));
    // Matched row overwritten from the remote (remote wins).
    expect(library.updateEntry).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'completed', currentEpisode: 12 })
    );
    // Pull NEVER writes to the remote account…
    expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    // …and never touches a local-only entry (id=2 has no remote counterpart).
    expect(library.updateEntry).not.toHaveBeenCalledWith(2, expect.anything());
    expect(result).toMatchObject({
      imported: 1,
      updatedLocal: 1,
      pushedNew: 0,
      updatedRemote: 0,
    });
  });
});

describe('AniListSyncService.syncEntry', () => {
  it('throws when no AniList account is connected', async () => {
    const { service, client } = makeService({
      token: null,
      local: [local({ id: 1, anilistId: 100 })],
    });
    await expect(service.syncEntry(1, 'auto')).rejects.toThrow(SYNC_NOT_CONNECTED_ERROR);
    expect(client.getMediaListEntry).not.toHaveBeenCalled();
  });

  it('throws when the local row does not exist', async () => {
    const { service } = makeService({ local: [] });
    await expect(service.syncEntry(42, 'auto')).rejects.toThrow(SYNC_ENTRY_NOT_FOUND_ERROR);
  });

  it('rejects while a full sync is running (shared single-flight guard)', async () => {
    // A never-resolving collection fetch keeps the full sync in-flight (running=true).
    let release!: () => void;
    const { service, client } = makeService({ local: [], remote: [] });
    client.getMediaListCollection.mockReturnValue(
      new Promise(resolve => {
        release = () => resolve([]);
      })
    );

    const full = service.sync(noop);
    // running was set synchronously before the first await, so the per-entry op sees it.
    await expect(service.syncEntry(1, 'auto')).rejects.toThrow(SYNC_IN_PROGRESS_ERROR);

    release();
    await full;
    // Slot released — the SAME service now accepts a per-entry op. Row 1 doesn't
    // exist in this service, so it reaches the NOT_FOUND path, which is only
    // reachable PAST the single-flight guard — proving `service` freed its slot.
    await expect(service.syncEntry(1, 'pull')).rejects.toThrow(SYNC_ENTRY_NOT_FOUND_ERROR);
  });

  it('skips a local-only entry with no AniList id', async () => {
    const { service, client, library } = makeService({
      local: [local({ id: 1, anilistId: null })],
    });
    const res = await service.syncEntry(1, 'push');
    expect(res).toEqual({ action: 'skipped' });
    expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    expect(library.markAniListSync).not.toHaveBeenCalled();
  });

  describe('push (force local -> remote)', () => {
    it('pushes the local row to AniList and re-baselines from the response, no remote read', async () => {
      const { service, client, library } = makeService({
        local: [local({ id: 5, anilistId: 200, status: 'completed', currentEpisode: 12 })],
      });
      const res = await service.syncEntry(5, 'push');
      expect(res).toEqual({ action: 'pushed' });
      expect(client.getMediaListEntry).not.toHaveBeenCalled();
      expect(client.saveMediaListEntry).toHaveBeenCalledWith(
        expect.objectContaining({ mediaId: 200, status: 'COMPLETED', progress: 12 })
      );
      expect(library.markAniListSync).toHaveBeenCalledWith(5, EPOCH + 100);
    });
  });

  describe('pull (force remote -> local)', () => {
    it('overwrites the local row from the remote entry and re-baselines from remote updatedAt', async () => {
      const { service, client, library } = makeService({
        local: [local({ id: 1, anilistId: 100, status: 'watching', currentEpisode: 2, score: 5 })],
        remoteEntry: remote({
          mediaId: 100,
          status: 'COMPLETED',
          progress: 12,
          score: 90,
          updatedAt: EPOCH + 500,
        }),
      });
      const res = await service.syncEntry(1, 'pull');
      expect(res).toEqual({ action: 'updated' });
      // Forced pull overwrites status/progress/score unconditionally (not monotonic).
      expect(library.updateEntry).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'completed', currentEpisode: 12, score: 9 })
      );
      expect(library.markAniListSync).toHaveBeenCalledWith(1, EPOCH + 500);
      expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    });

    it('skips when there is no remote entry to pull from', async () => {
      const { service, library } = makeService({
        local: [local({ id: 1, anilistId: 100 })],
        remoteEntry: null,
      });
      const res = await service.syncEntry(1, 'pull');
      expect(res).toEqual({ action: 'skipped' });
      expect(library.updateEntry).not.toHaveBeenCalled();
      expect(library.markAniListSync).not.toHaveBeenCalled();
    });

    it('drives progress DOWN to a present lower remote value but never clears a local score the remote lacks', async () => {
      // Force-pull semantics: the remote wins for any field it HAS (progress 3 < local 8),
      // but it never clobbers a populated local field (score 7) to absent just because the
      // remote is unrated. status is always remote-present so it's adopted too.
      const { service, library } = makeService({
        local: [local({ id: 1, anilistId: 100, status: 'completed', currentEpisode: 8, score: 7 })],
        remoteEntry: remote({
          mediaId: 100,
          status: 'CURRENT',
          progress: 3,
          score: null, // unrated remotely
          notes: null,
          updatedAt: EPOCH + 20,
        }),
      });
      const res = await service.syncEntry(1, 'pull');
      expect(res).toEqual({ action: 'updated' });
      const update = library.updateEntry.mock.calls[0][1];
      expect(update).toEqual({ status: 'watching', currentEpisode: 3 });
      // The unrated remote must NOT wipe the local score/notes.
      expect(update).not.toHaveProperty('score');
      expect(update).not.toHaveProperty('notes');
      expect(library.markAniListSync).toHaveBeenCalledWith(1, EPOCH + 20);
    });

    it('reports unchanged (only re-baselines) when local already matches remote', async () => {
      const { service, library } = makeService({
        local: [local({ id: 1, anilistId: 100, status: 'watching', currentEpisode: 3 })],
        remoteEntry: remote({
          mediaId: 100,
          status: 'CURRENT',
          progress: 3,
          updatedAt: EPOCH + 9,
        }),
      });
      const res = await service.syncEntry(1, 'pull');
      expect(res).toEqual({ action: 'unchanged' });
      expect(library.updateEntry).not.toHaveBeenCalled();
      expect(library.markAniListSync).toHaveBeenCalledWith(1, EPOCH + 9);
    });
  });

  describe('auto (merge decision, mirrors full sync match branch)', () => {
    it('pushes the higher local progress and re-baselines from the push response', async () => {
      const { service, client, library } = makeService({
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
        remoteEntry: remote({ mediaId: 100, progress: 3, updatedAt: EPOCH }),
      });
      const res = await service.syncEntry(1, 'auto');
      expect(res).toEqual({ action: 'updated' });
      expect(client.saveMediaListEntry).toHaveBeenCalledWith(
        expect.objectContaining({ mediaId: 100, progress: 8 })
      );
      expect(library.markAniListSync).toHaveBeenCalledWith(1, EPOCH + 100);
    });

    it('reports unchanged and only re-baselines when both sides agree', async () => {
      const { service, client, library } = makeService({
        local: [local({ id: 1, anilistId: 100, currentEpisode: 5, status: 'watching' })],
        remoteEntry: remote({ mediaId: 100, progress: 5, status: 'CURRENT', updatedAt: EPOCH }),
      });
      const res = await service.syncEntry(1, 'auto');
      expect(res).toEqual({ action: 'unchanged' });
      expect(client.saveMediaListEntry).not.toHaveBeenCalled();
      expect(library.updateEntry).not.toHaveBeenCalled();
      expect(library.markAniListSync).toHaveBeenCalledWith(1, EPOCH);
    });

    it('pushes a local-only entry when there is no remote match (mirrors full-sync push branch)', async () => {
      const { service, client, library } = makeService({
        local: [local({ id: 3, anilistId: 300, status: 'completed', currentEpisode: 24 })],
        remoteEntry: null,
      });
      const res = await service.syncEntry(3, 'auto');
      expect(res).toEqual({ action: 'pushed' });
      expect(client.saveMediaListEntry).toHaveBeenCalledWith(
        expect.objectContaining({ mediaId: 300, status: 'COMPLETED', progress: 24 })
      );
      expect(library.markAniListSync).toHaveBeenCalledWith(3, EPOCH + 100);
    });
  });

  describe('optimistic-concurrency re-read guard', () => {
    it('skips a pull when the row was edited locally mid-sync (re-read returns a newer updatedAt)', async () => {
      const { service, client, library } = makeService({
        local: [local({ id: 1, anilistId: 100, currentEpisode: 2 })],
        remoteEntry: remote({ mediaId: 100, status: 'COMPLETED', progress: 12 }),
      });
      library.getEntryById.mockReturnValue({ id: 1, updatedAt: '2099-01-01 00:00:00' });

      const res = await service.syncEntry(1, 'pull');
      expect(res).toEqual({ action: 'unchanged' });
      expect(library.updateEntry).not.toHaveBeenCalled();
      expect(library.markAniListSync).not.toHaveBeenCalled();
      expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    });

    it('skips an auto merge when the row was deleted locally mid-sync (re-read returns undefined)', async () => {
      const { service, client, library } = makeService({
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
        remoteEntry: remote({ mediaId: 100, progress: 3, updatedAt: EPOCH }),
      });
      library.getEntryById.mockReturnValue(undefined);

      const res = await service.syncEntry(1, 'auto');
      expect(res).toEqual({ action: 'unchanged' });
      expect(library.updateEntry).not.toHaveBeenCalled();
      expect(library.markAniListSync).not.toHaveBeenCalled();
      expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    });
  });

  it('releases the single-flight slot after a per-entry op (success path)', async () => {
    const { service } = makeService({
      local: [local({ id: 1, anilistId: 100 })],
      remoteEntry: remote({ mediaId: 100 }),
    });
    await service.syncEntry(1, 'auto');
    // A subsequent op is allowed — the slot was released in `finally`.
    await expect(service.syncEntry(1, 'auto')).resolves.toBeDefined();
  });
});
