import {
  decideMalMerge,
  buildMalPullUpdate,
  buildMalAddPayload,
  buildMalPushInput,
} from '../mal-reconcile';
import type { AniListSyncRow } from '../../library/library.types';
import type { MalListEntry } from '../../anime/mal-client';

const EPOCH = Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000);

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

describe('decideMalMerge', () => {
  it('pushes the higher local progress (monotonic) without a local write', () => {
    const decision = decideMalMerge(
      local({ currentEpisode: 8, updatedAt: '2024-06-01 00:00:00' }),
      remote({ progress: 3, updatedAt: EPOCH })
    );
    expect(decision.remotePush).toEqual({ progress: 8 });
    expect(decision.localUpdate).toBeNull();
  });

  it('pulls the higher remote progress to the local row', () => {
    const decision = decideMalMerge(
      local({ currentEpisode: 2 }),
      remote({ progress: 9, updatedAt: EPOCH })
    );
    expect(decision.localUpdate).toEqual({ currentEpisode: 9 });
  });

  it('OMITS score on push when the merged score is unrated (0) — never sends score:0', () => {
    // Local unrated (0/null), remote unrated → no score in either write.
    const decision = decideMalMerge(local({ score: null }), remote({ score: 0 }));
    expect(decision.remotePush ?? {}).not.toHaveProperty('score');
    expect(decision.localUpdate ?? {}).not.toHaveProperty('score');
  });

  it('present-wins: a populated local score is pushed when the remote is unrated (0)', () => {
    const decision = decideMalMerge(
      local({ score: 7, updatedAt: '2024-06-01 00:00:00' }),
      remote({ score: 0 })
    );
    expect(decision.remotePush).toEqual({ score: 7 });
  });

  it('present-wins: a populated remote score is pulled when the local is unrated', () => {
    const decision = decideMalMerge(local({ score: null }), remote({ score: 8 }));
    expect(decision.localUpdate).toEqual({ score: 8 });
  });

  it('first contact (no MAL baseline) resolves a score conflict in MAL favor', () => {
    const decision = decideMalMerge(
      local({
        score: 5,
        malSyncedAt: null,
        malRemoteUpdatedAt: null,
        updatedAt: '2024-06-01 00:00:00',
      }),
      remote({ score: 9, updatedAt: EPOCH })
    );
    // MAL wins on first contact → local is pulled to 9, no remote push of the local 5.
    expect(decision.localUpdate).toEqual({ score: 9 });
    expect(decision.remotePush ?? {}).not.toHaveProperty('score');
    expect(decision.conflict).toBe(false); // first contact is not a conflict
  });

  it('counts a real conflict when both sides changed since baseline (latest-wins)', () => {
    // Both changed since the baseline; local is newer → local wins, conflict flagged.
    const decision = decideMalMerge(
      local({
        score: 6,
        status: 'completed',
        updatedAt: '2024-06-01 00:00:00',
        malSyncedAt: '2024-01-01 00:00:00',
        malRemoteUpdatedAt: EPOCH,
      }),
      remote({ score: 9, status: 'watching', updatedAt: EPOCH + 1000 })
    );
    expect(decision.conflict).toBe(true);
  });

  it('reports no writes when both sides already agree (only the caller re-baselines)', () => {
    const decision = decideMalMerge(
      local({ status: 'watching', currentEpisode: 5, score: 8 }),
      remote({ status: 'watching', progress: 5, score: 8 })
    );
    expect(decision.localUpdate).toBeNull();
    expect(decision.remotePush).toBeNull();
  });

  it('maps status 1:1 (no wire enum) on both sides', () => {
    const decision = decideMalMerge(
      local({ status: 'on_hold', updatedAt: '2024-06-01 00:00:00' }),
      remote({ status: 'watching' })
    );
    expect(decision.remotePush).toEqual({ status: 'on_hold' });
  });
});

describe('buildMalPullUpdate (forced pull)', () => {
  it('adopts a lower present remote progress but never clears a local score the remote lacks', () => {
    const update = buildMalPullUpdate(
      local({ status: 'completed', currentEpisode: 8, score: 7 }),
      remote({ status: 'watching', progress: 3, score: 0 })
    );
    expect(update).toEqual({ status: 'watching', currentEpisode: 3 });
    expect(update).not.toHaveProperty('score'); // unrated remote must not wipe local 7
  });

  it('adopts a real remote score', () => {
    const update = buildMalPullUpdate(local({ score: null }), remote({ score: 9 }));
    expect(update).toEqual({ score: 9 });
  });

  it('returns null when nothing would change', () => {
    const update = buildMalPullUpdate(
      local({ status: 'watching', currentEpisode: 5, score: 8 }),
      remote({ status: 'watching', progress: 5, score: 8 })
    );
    expect(update).toBeNull();
  });
});

describe('buildMalAddPayload (import)', () => {
  it('keys the new row by malId and omits an unrated score', () => {
    const payload = buildMalAddPayload(
      remote({ mediaId: 555, title: 'Imported', status: 'completed', progress: 12, score: 0 })
    );
    expect(payload).toEqual({
      malId: 555,
      title: 'Imported',
      status: 'completed',
      currentEpisode: 12,
      score: undefined,
    });
  });

  it('carries a real score through to the insert', () => {
    const payload = buildMalAddPayload(remote({ mediaId: 7, score: 9 }));
    expect(payload.score).toBe(9);
  });
});

describe('buildMalPushInput (create-on-MAL)', () => {
  it('omits score when local is unrated (never push score:0)', () => {
    const input = buildMalPushInput(
      local({ malId: 200, status: 'completed', currentEpisode: 24, score: null })
    );
    expect(input).toEqual({ malId: 200, status: 'completed', progress: 24 });
    expect(input).not.toHaveProperty('score');
  });

  it('rounds and includes a real local score', () => {
    const input = buildMalPushInput(local({ malId: 9, score: 7 }));
    expect(input.score).toBe(7);
  });

  it('omits a fractional score that rounds to 0 (never push score:0)', () => {
    // 0.4 is "present" (>0) but rounds to 0 — must NOT be pushed as a 0-rating.
    const input = buildMalPushInput(local({ malId: 9, score: 0.4 }));
    expect(input).not.toHaveProperty('score');
  });
});
