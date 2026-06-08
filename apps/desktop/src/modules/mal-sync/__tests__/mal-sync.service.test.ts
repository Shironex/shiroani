import {
  MalSyncService,
  MAL_SYNC_IN_PROGRESS_ERROR,
  MAL_SYNC_NOT_CONNECTED_ERROR,
  MAL_SYNC_ENTRY_NOT_FOUND_ERROR,
} from '../mal-sync.service';
import {
  AniListSyncService,
  SYNC_IN_PROGRESS_ERROR,
} from '../../anilist-sync/anilist-sync.service';
import type { MalListEntry } from '../../anime/mal-client';
import type { AniListSyncRow } from '../../library/library.types';
import type { SyncProgress } from '@shiroani/shared';

const EPOCH = Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000);

type ClientMock = {
  getViewer: jest.Mock;
  getAnimeList: jest.Mock;
  getAnimeListEntry: jest.Mock;
  updateListStatus: jest.Mock;
  searchAnime: jest.Mock;
};
type LibraryMock = {
  getEntriesForSync: jest.Mock;
  getSyncRowById: jest.Mock;
  getEntryById: jest.Mock;
  addEntry: jest.Mock;
  updateEntry: jest.Mock;
  markMalSync: jest.Mock;
  setMalId: jest.Mock;
};
type TokenMock = { getAccessToken: jest.Mock };
type AniListMock = {
  hasToken: jest.Mock;
  getViewer: jest.Mock;
  getMediaListCollection: jest.Mock;
  getMediaListEntry: jest.Mock;
};

function makeService(opts: {
  remote?: MalListEntry[];
  remoteEntry?: MalListEntry | null;
  local?: AniListSyncRow[];
  token?: string | null;
  search?: { id: number; title: string }[];
  /**
   * Optional AniList client for the idMal link pre-pass. `connected: false`
   * simulates no AniList account. `collection` feeds getMediaListCollection
   * (anilistId→idMal), `entry` feeds the single-entry getMediaListEntry.
   */
  aniList?: {
    connected?: boolean;
    collection?: { mediaId: number; idMal?: number }[];
    entry?: { idMal?: number } | null;
  };
}) {
  const client: ClientMock = {
    getViewer: jest.fn().mockResolvedValue({ id: 7, name: 'Anya' }),
    getAnimeList: jest.fn().mockResolvedValue(opts.remote ?? []),
    getAnimeListEntry: jest.fn().mockResolvedValue(opts.remoteEntry ?? null),
    // updateListStatus echoes a post-write remote updatedAt (EPOCH+100).
    updateListStatus: jest.fn().mockResolvedValue({
      status: 'watching',
      score: 0,
      progress: 0,
      updatedAt: EPOCH + 100,
    }),
    searchAnime: jest.fn().mockResolvedValue(opts.search ?? []),
  };
  // A mutable copy so setMalId mutations are visible to a later getEntriesForSync
  // call (mirrors the real DB: the backfill pre-pass links a row, then the engine
  // re-reads the now-linked row).
  const localRows = (opts.local ?? []).map(r => ({ ...r }));
  const library: LibraryMock = {
    getEntriesForSync: jest.fn(() => localRows.map(r => ({ ...r }))),
    getSyncRowById: jest.fn((id: number) => {
      const row = localRows.find(r => r.id === id);
      return row ? { ...row } : undefined;
    }),
    getEntryById: jest.fn((id: number) => {
      const row = localRows.find(r => r.id === id);
      return row ? { id, updatedAt: row.updatedAt } : undefined;
    }),
    addEntry: jest.fn().mockReturnValue({ id: 999 }),
    updateEntry: jest.fn(),
    markMalSync: jest.fn(),
    setMalId: jest.fn((id: number, malId: number) => {
      const row = localRows.find(r => r.id === id);
      if (row) row.malId = malId;
    }),
  };
  const tokenPort: TokenMock = {
    getAccessToken: jest.fn().mockResolvedValue(opts.token === undefined ? 'tok' : opts.token),
  };

  let aniList: AniListMock | undefined;
  if (opts.aniList) {
    const connected = opts.aniList.connected ?? true;
    aniList = {
      hasToken: jest.fn().mockResolvedValue(connected),
      getViewer: jest.fn().mockResolvedValue({ id: 7, name: 'Anya' }),
      getMediaListCollection: jest.fn().mockResolvedValue(opts.aniList.collection ?? []),
      getMediaListEntry: jest.fn().mockResolvedValue(opts.aniList.entry ?? null),
    };
  }

  const service = new MalSyncService(
    client as never,
    library as never,
    tokenPort as never,
    aniList as never
  );
  return { service, client, library, tokenPort, localRows, aniList };
}

const noop = (): void => {};

function remote(o: Partial<MalListEntry> = {}): MalListEntry {
  return {
    mediaId: 100,
    title: 'Remote Show',
    status: 'watching',
    progress: 1,
    score: 0,
    updatedAt: EPOCH,
    ...o,
  };
}

function local(o: Partial<AniListSyncRow> = {}): AniListSyncRow {
  return {
    id: 1,
    anilistId: null,
    malId: 100,
    title: 'Local Show',
    status: 'watching',
    currentEpisode: 1,
    score: null,
    notes: null,
    updatedAt: '2024-01-01 00:00:00',
    anilistSyncedAt: null,
    anilistRemoteUpdatedAt: null,
    malSyncedAt: '2024-01-01 00:00:00',
    malRemoteUpdatedAt: EPOCH,
    ...o,
  };
}

describe('MalSyncService.sync', () => {
  it('throws when no MAL account is connected', async () => {
    const { service, client } = makeService({ token: null });
    await expect(service.sync(noop)).rejects.toThrow(MAL_SYNC_NOT_CONNECTED_ERROR);
    expect(client.getAnimeList).not.toHaveBeenCalled();
  });

  it('enforces single-flight: a concurrent MAL sync is rejected', async () => {
    const { service } = makeService({ remote: [], local: [] });
    const first = service.sync(noop);
    await expect(service.sync(noop)).rejects.toThrow(MAL_SYNC_IN_PROGRESS_ERROR);
    await first;
    await expect(service.sync(noop)).resolves.toBeDefined();
  });

  it('imports a MAL-only entry and keys the new row by mal_id, stamping the baseline', async () => {
    const { service, library } = makeService({
      remote: [
        remote({ mediaId: 555, title: 'Imported', score: 9, status: 'completed', progress: 12 }),
      ],
      local: [],
    });
    const result = await service.sync(noop);
    expect(library.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ malId: 555, score: 9, status: 'completed', currentEpisode: 12 })
    );
    expect(library.markMalSync).toHaveBeenCalledWith(999, EPOCH);
    expect(result.imported).toBe(1);
  });

  it('pushes a local-only entry to MAL and records the returned updatedAt baseline', async () => {
    const { service, client, library } = makeService({
      remote: [],
      local: [local({ id: 5, malId: 200, status: 'completed', currentEpisode: 12, score: 8 })],
    });
    const result = await service.sync(noop);
    expect(client.updateListStatus).toHaveBeenCalledWith(
      expect.objectContaining({ malId: 200, status: 'completed', progress: 12, score: 8 })
    );
    expect(library.markMalSync).toHaveBeenCalledWith(5, EPOCH + 100);
    expect(result.pushedNew).toBe(1);
  });

  it('omits score on push when local is unrated (never sends score:0)', async () => {
    const { service, client } = makeService({
      remote: [],
      local: [local({ id: 5, malId: 200, status: 'completed', currentEpisode: 12, score: null })],
    });
    await service.sync(noop);
    const pushArg = client.updateListStatus.mock.calls[0][0];
    expect(pushArg).not.toHaveProperty('score');
  });

  it('skips a local entry that has no mal_id and cannot be resolved by search', async () => {
    const { service, client, library } = makeService({
      remote: [],
      local: [local({ id: 9, malId: null, title: 'No MAL match' })],
      search: [], // no hits → stays unresolved
    });
    const result = await service.sync(noop);
    expect(client.updateListStatus).not.toHaveBeenCalled();
    expect(library.markMalSync).not.toHaveBeenCalled();
    expect(result.skippedNoId).toBe(1);
  });

  it('reconciles a match: pushes the higher local progress and re-baselines from the push response', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 3, updatedAt: EPOCH })],
      local: [
        local({
          id: 1,
          malId: 100,
          currentEpisode: 8,
          updatedAt: '2024-06-01 00:00:00',
          malSyncedAt: '2024-01-01 00:00:00',
          malRemoteUpdatedAt: EPOCH,
        }),
      ],
    });
    const result = await service.sync(noop);
    expect(client.updateListStatus).toHaveBeenCalledWith(
      expect.objectContaining({ malId: 100, progress: 8 })
    );
    expect(library.markMalSync).toHaveBeenCalledWith(1, EPOCH + 100);
    expect(result.updatedRemote).toBe(1);
  });

  it('counts an unchanged match without writing, still re-baselining', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100, progress: 5, status: 'watching' })],
      local: [local({ malId: 100, currentEpisode: 5, status: 'watching' })],
    });
    const result = await service.sync(noop);
    expect(client.updateListStatus).not.toHaveBeenCalled();
    expect(library.updateEntry).not.toHaveBeenCalled();
    expect(library.markMalSync).toHaveBeenCalledWith(1, EPOCH);
    expect(result.unchanged).toBe(1);
  });

  it('folds is_rewatching to watching on import (via the mapped MalListEntry status)', async () => {
    // The client already folds is_rewatching → 'watching' in mapListEntry; the
    // service consumes the canonical status. Verify import lands the folded status.
    const { service, library } = makeService({
      remote: [remote({ mediaId: 321, title: 'Rewatch', status: 'watching' })],
      local: [],
    });
    await service.sync(noop);
    expect(library.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({ malId: 321, status: 'watching' })
    );
  });

  it('dedups a media MAL returns more than once (same mediaId)', async () => {
    const { service, library } = makeService({
      remote: [
        remote({ mediaId: 100, title: 'Dup', updatedAt: EPOCH }),
        remote({ mediaId: 100, title: 'Dup', updatedAt: EPOCH + 5 }),
      ],
      local: [],
    });
    const result = await service.sync(noop);
    expect(library.addEntry).toHaveBeenCalledTimes(1);
    expect(result.imported).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('emits per-entry progress with a running total', async () => {
    const { service } = makeService({
      remote: [remote({ mediaId: 100, title: 'First' }), remote({ mediaId: 101, title: 'Second' })],
      local: [],
    });
    const events: SyncProgress[] = [];
    await service.sync(p => events.push(p));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ current: 1, total: 2, action: 'imported', title: 'First' });
  });
});

describe('MalSyncService.sync — directional (push / pull) reaches the MAL adapter', () => {
  it('push create-missing: writes only the MAL-absent entry, leaves the existing match, never imports', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100 }), remote({ mediaId: 999, title: 'MAL only' })],
      local: [
        local({ id: 1, malId: 100, status: 'completed', currentEpisode: 12 }),
        local({ id: 2, malId: 200, status: 'watching', currentEpisode: 3 }),
        local({ id: 3, malId: null }),
      ],
    });
    const result = await service.sync(noop, { direction: 'push', pushMode: 'create-missing' });

    expect(client.updateListStatus).toHaveBeenCalledTimes(1);
    expect(client.updateListStatus).toHaveBeenCalledWith(expect.objectContaining({ malId: 200 }));
    expect(client.updateListStatus).not.toHaveBeenCalledWith(
      expect.objectContaining({ malId: 100 })
    );
    expect(library.addEntry).not.toHaveBeenCalled();
    expect(result).toMatchObject({ pushedNew: 1, updatedRemote: 0, imported: 0, skippedNoId: 1 });
  });

  it('push overwrite: writes every linked local entry, never imports', async () => {
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 100 }), remote({ mediaId: 999 })],
      local: [
        local({ id: 1, malId: 100, status: 'completed', currentEpisode: 12 }),
        local({ id: 2, malId: 200, status: 'watching', currentEpisode: 3 }),
      ],
    });
    const result = await service.sync(noop, { direction: 'push', pushMode: 'overwrite' });

    expect(client.updateListStatus).toHaveBeenCalledWith(expect.objectContaining({ malId: 100 }));
    expect(client.updateListStatus).toHaveBeenCalledWith(expect.objectContaining({ malId: 200 }));
    expect(client.updateListStatus).toHaveBeenCalledTimes(2);
    expect(library.addEntry).not.toHaveBeenCalled();
    expect(result).toMatchObject({ updatedRemote: 1, pushedNew: 1, imported: 0 });
  });

  it('pull: imports MAL-only and overwrites matched from MAL, never writes to MAL', async () => {
    const { service, client, library } = makeService({
      remote: [
        remote({
          mediaId: 999,
          title: 'MAL only',
          status: 'completed',
          progress: 24,
          updatedAt: EPOCH + 10,
        }),
        remote({ mediaId: 100, status: 'completed', progress: 12, updatedAt: EPOCH + 20 }),
      ],
      local: [
        local({ id: 1, malId: 100, status: 'watching', currentEpisode: 2 }),
        local({ id: 2, malId: 200, status: 'watching', currentEpisode: 5 }),
      ],
    });
    const result = await service.sync(noop, { direction: 'pull' });

    expect(library.addEntry).toHaveBeenCalledWith(expect.objectContaining({ malId: 999 }));
    expect(library.updateEntry).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'completed', currentEpisode: 12 })
    );
    expect(client.updateListStatus).not.toHaveBeenCalled();
    expect(library.updateEntry).not.toHaveBeenCalledWith(2, expect.anything());
    expect(result).toMatchObject({ imported: 1, updatedLocal: 1, pushedNew: 0, updatedRemote: 0 });
  });
});

describe('MalSyncService backfill (mal_id resolution)', () => {
  it('resolves mal_id by a single confident search hit, then pushes', async () => {
    const { service, client, library } = makeService({
      remote: [],
      local: [
        local({ id: 5, malId: null, title: 'Frieren', status: 'watching', currentEpisode: 4 }),
      ],
      search: [{ id: 16498, title: 'Frieren' }],
    });
    const result = await service.sync(noop);
    expect(library.setMalId).toHaveBeenCalledWith(5, 16498);
    expect(client.updateListStatus).toHaveBeenCalledWith(
      expect.objectContaining({ malId: 16498, status: 'watching', progress: 4 })
    );
    expect(result.pushedNew).toBe(1);
    expect(result.skippedNoId).toBe(0);
  });

  it('resolves mal_id when multiple hits but exactly one exact-title match', async () => {
    const { service, library } = makeService({
      remote: [],
      local: [local({ id: 5, malId: null, title: 'Bleach' })],
      search: [
        { id: 1, title: 'Bleach: Thousand-Year Blood War' },
        { id: 269, title: 'Bleach' },
        { id: 2, title: 'Bleach the Movie' },
      ],
    });
    await service.sync(noop);
    expect(library.setMalId).toHaveBeenCalledWith(5, 269);
  });

  it('skips (no setMalId) when search is ambiguous — multiple hits, no exact match', async () => {
    const { service, library } = makeService({
      remote: [],
      local: [local({ id: 5, malId: null, title: 'Show' })],
      search: [
        { id: 1, title: 'Show Season 1' },
        { id: 2, title: 'Show Season 2' },
      ],
    });
    const result = await service.sync(noop);
    expect(library.setMalId).not.toHaveBeenCalled();
    expect(result.skippedNoId).toBe(1);
  });

  it('UNIQUE collision on backfill: skip+log+continue, never aborts the run', async () => {
    const { service, client, library, localRows } = makeService({
      remote: [],
      local: [
        // First row resolves to 42 and pushes fine.
        local({ id: 1, malId: null, title: 'Alpha' }),
        // Second row ALSO resolves to 42 → setMalId throws UNIQUE → skip+continue.
        local({ id: 2, malId: null, title: 'Beta' }),
      ],
    });
    // Each search confidently matches its own query (exact normalized title) but
    // all resolve to the SAME id 42 — so the second backfill hits the UNIQUE index.
    client.searchAnime.mockImplementation((q: string) => Promise.resolve([{ id: 42, title: q }]));
    // setMalId links id=1 to 42 (mutating the row so the engine sees it), but
    // throws a UNIQUE violation for id=2 (42 is already linked to id=1).
    library.setMalId.mockImplementation((id: number, malId: number) => {
      if (id === 2) throw new Error('UNIQUE constraint failed: anime_library.mal_id');
      const row = localRows.find(r => r.id === id);
      if (row) row.malId = malId;
    });

    const result = await service.sync(noop);
    // The run completed (no throw). id=1 pushed; id=2 stayed unresolved → skippedNoId.
    expect(result.errors).toBe(0);
    // id=1 was linked + pushed; id=2 was skipped.
    expect(client.updateListStatus).toHaveBeenCalledTimes(1);
    expect(client.updateListStatus).toHaveBeenCalledWith(expect.objectContaining({ malId: 42 }));
    expect(result.skippedNoId).toBe(1);
  });

  it('prefers an existing mal_id over a search (no search call for already-linked rows)', async () => {
    const { service, client } = makeService({
      remote: [],
      local: [local({ id: 5, malId: 999, title: 'Linked' })],
    });
    await service.sync(noop);
    expect(client.searchAnime).not.toHaveBeenCalled();
    expect(client.updateListStatus).toHaveBeenCalledWith(expect.objectContaining({ malId: 999 }));
  });

  it('never title-searches an AniList-linked row (mal_id comes from idMal, not search)', async () => {
    // A row with an anilistId but no mal_id means AniList has no MAL mapping for it
    // (the AniList sync would have set mal_id from idMal otherwise). Title-searching
    // it would only risk mis-linking — so the backfill skips it entirely.
    const { service, client, library } = makeService({
      remote: [],
      local: [local({ id: 5, anilistId: 4224, malId: null, title: 'Has AniList, no MAL map' })],
    });
    const result = await service.sync(noop);
    expect(client.searchAnime).not.toHaveBeenCalled();
    expect(library.setMalId).not.toHaveBeenCalled();
    expect(client.updateListStatus).not.toHaveBeenCalled();
    expect(result.skippedNoId).toBe(1);
  });
});

describe('MalSyncService idMal pre-pass (order-independence: MAL-first then AniList)', () => {
  it('links mal_id from AniList idMal BEFORE the import loop, so MAL matches by id (no duplicate)', async () => {
    // MAL-first scenario: the AniList "86" row has no mal_id yet. The pre-pass links
    // it from AniList's idMal (41457); the engine then matches MAL's 86 by id and
    // reconciles instead of importing a duplicate.
    const { service, client, library } = makeService({
      remote: [remote({ mediaId: 41457, title: '86', status: 'watching', progress: 5 })],
      local: [
        local({
          id: 1,
          anilistId: 116589,
          malId: null,
          title: '86: Eighty Six',
          currentEpisode: 5,
          status: 'watching',
        }),
      ],
      aniList: { collection: [{ mediaId: 116589, idMal: 41457 }] },
    });
    const result = await service.sync(noop);
    expect(library.setMalId).toHaveBeenCalledWith(1, 41457);
    expect(library.addEntry).not.toHaveBeenCalled(); // NO duplicate import
    expect(result.imported).toBe(0);
    expect(client.searchAnime).not.toHaveBeenCalled(); // linked by idMal, never searched
  });

  it('skips the AniList round-trip when every AniList row is already linked', async () => {
    const { service, aniList } = makeService({
      remote: [],
      local: [local({ id: 1, anilistId: 116589, malId: 41457, title: '86' })],
      aniList: { collection: [{ mediaId: 116589, idMal: 41457 }] },
    });
    await service.sync(noop);
    expect(aniList!.getMediaListCollection).not.toHaveBeenCalled();
  });

  it('is a no-op when AniList is not connected (cannot resolve idMal)', async () => {
    const { service, library, aniList } = makeService({
      remote: [],
      local: [local({ id: 1, anilistId: 116589, malId: null, title: '86' })],
      aniList: { connected: false, collection: [{ mediaId: 116589, idMal: 41457 }] },
    });
    await service.sync(noop);
    expect(aniList!.getMediaListCollection).not.toHaveBeenCalled();
    expect(library.setMalId).not.toHaveBeenCalled();
  });

  it('skips a row AniList reports no idMal for (no MAL equivalent)', async () => {
    const { service, library } = makeService({
      remote: [],
      local: [local({ id: 1, anilistId: 116589, malId: null, title: 'No MAL map' })],
      aniList: { collection: [{ mediaId: 116589 }] }, // idMal absent
    });
    await service.sync(noop);
    expect(library.setMalId).not.toHaveBeenCalled();
  });

  it('survives a UNIQUE collision when a MAL-only dup already holds the id', async () => {
    const { service, library, localRows } = makeService({
      remote: [],
      local: [local({ id: 1, anilistId: 116589, malId: null, title: '86: Eighty Six' })],
      aniList: { collection: [{ mediaId: 116589, idMal: 41457 }] },
    });
    library.setMalId.mockImplementation(() => {
      throw new Error('UNIQUE constraint failed: anime_library.mal_id');
    });
    void localRows;
    // Must not throw — the collision is caught + skipped.
    await expect(service.sync(noop)).resolves.toBeDefined();
  });

  it('syncEntry push links a single AniList row via getMediaListEntry idMal first', async () => {
    const { service, client, library } = makeService({
      remote: [],
      local: [
        local({
          id: 1,
          anilistId: 116589,
          malId: null,
          title: '86',
          status: 'watching',
          currentEpisode: 5,
        }),
      ],
      aniList: { entry: { idMal: 41457 } },
    });
    await service.syncEntry(1, 'push');
    expect(library.setMalId).toHaveBeenCalledWith(1, 41457);
    expect(client.searchAnime).not.toHaveBeenCalled();
    expect(client.updateListStatus).toHaveBeenCalledWith(expect.objectContaining({ malId: 41457 }));
  });
});

describe('MalSyncService.syncEntry', () => {
  it('throws when no MAL account is connected', async () => {
    const { service } = makeService({ token: null, local: [local({ id: 1, malId: 100 })] });
    await expect(service.syncEntry(1, 'auto')).rejects.toThrow(MAL_SYNC_NOT_CONNECTED_ERROR);
  });

  it('throws when the local row does not exist', async () => {
    const { service } = makeService({ local: [] });
    await expect(service.syncEntry(42, 'auto')).rejects.toThrow(MAL_SYNC_ENTRY_NOT_FOUND_ERROR);
  });

  it('push: writes the local row to MAL and re-baselines from the response (no remote read)', async () => {
    const { service, client, library } = makeService({
      local: [local({ id: 5, malId: 200, status: 'completed', currentEpisode: 12 })],
    });
    const res = await service.syncEntry(5, 'push');
    expect(res).toEqual({ action: 'pushed' });
    expect(client.getAnimeListEntry).not.toHaveBeenCalled();
    expect(client.updateListStatus).toHaveBeenCalledWith(
      expect.objectContaining({ malId: 200, status: 'completed', progress: 12 })
    );
    expect(library.markMalSync).toHaveBeenCalledWith(5, EPOCH + 100);
  });

  it('pull: overwrites the local row from the MAL entry and re-baselines from remote updatedAt', async () => {
    const { service, client, library } = makeService({
      local: [local({ id: 1, malId: 100, status: 'watching', currentEpisode: 2, score: 5 })],
      remoteEntry: remote({
        mediaId: 100,
        status: 'completed',
        progress: 12,
        score: 9,
        updatedAt: EPOCH + 500,
      }),
    });
    const res = await service.syncEntry(1, 'pull');
    expect(res).toEqual({ action: 'updated' });
    expect(library.updateEntry).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'completed', currentEpisode: 12, score: 9 })
    );
    expect(library.markMalSync).toHaveBeenCalledWith(1, EPOCH + 500);
    expect(client.updateListStatus).not.toHaveBeenCalled();
  });

  it('pull: skips when there is no remote entry to pull from', async () => {
    const { service, library } = makeService({
      local: [local({ id: 1, malId: 100 })],
      remoteEntry: null,
    });
    const res = await service.syncEntry(1, 'pull');
    expect(res).toEqual({ action: 'skipped' });
    expect(library.updateEntry).not.toHaveBeenCalled();
  });

  it('auto: pushes a local-only entry when there is no remote match', async () => {
    const { service, client } = makeService({
      local: [local({ id: 3, malId: 300, status: 'completed', currentEpisode: 24 })],
      remoteEntry: null,
    });
    const res = await service.syncEntry(3, 'auto');
    expect(res).toEqual({ action: 'pushed' });
    expect(client.updateListStatus).toHaveBeenCalledWith(
      expect.objectContaining({ malId: 300, status: 'completed', progress: 24 })
    );
  });

  it('skips a local-only entry with no mal_id that cannot be resolved', async () => {
    const { service, client } = makeService({
      local: [local({ id: 1, malId: null, title: 'Unmatchable' })],
      search: [],
    });
    const res = await service.syncEntry(1, 'push');
    expect(res).toEqual({ action: 'skipped' });
    expect(client.updateListStatus).not.toHaveBeenCalled();
  });
});

describe('MAL sync is independent of AniList sync (separate single-flight)', () => {
  it('a MAL sync proceeds while an AniList full sync holds its OWN running flag', async () => {
    // Hold the AniList sync in-flight via a never-resolving collection fetch.
    let release!: () => void;
    const anilistClient = {
      getViewer: jest.fn().mockResolvedValue({ id: 1, name: 'A' }),
      getMediaListCollection: jest.fn().mockReturnValue(
        new Promise(resolve => {
          release = () => resolve([]);
        })
      ),
      getMediaListEntry: jest.fn(),
      saveMediaListEntry: jest.fn(),
    };
    const anilistLibrary = {
      getEntriesForSync: jest.fn().mockReturnValue([]),
      getSyncRowById: jest.fn(),
      getEntryById: jest.fn(),
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
      markAniListSync: jest.fn(),
    };
    const anilistToken = { getAccessToken: jest.fn().mockResolvedValue('a-tok') };
    const anilist = new AniListSyncService(
      anilistClient as never,
      anilistLibrary as never,
      anilistToken as never
    );

    const anilistRun = anilist.sync(noop); // running=true, parked on the collection fetch
    // The AniList single-flight guard rejects a SECOND AniList sync...
    await expect(anilist.sync(noop)).rejects.toThrow(SYNC_IN_PROGRESS_ERROR);

    // ...but the MAL sync uses a SEPARATE service instance + flag, so it runs fine.
    const { service: mal } = makeService({ remote: [], local: [] });
    await expect(mal.sync(noop)).resolves.toBeDefined();

    release();
    await anilistRun;
  });
});
