import {
  decideMerge,
  buildAddPayloadFromRemote,
  buildPullUpdateFromRemote,
  buildPushInputFromLocal,
  statusFromAniList,
  statusToAniList,
  localScoreToRaw,
  rawScoreToLocal,
  parseLocalMs,
} from '../reconcile';
import type { AniListSyncRow } from '../../library/library.types';
import type { AniListMediaListEntry } from '../../anime/types';

// Fixed UTC instants so timestamp comparisons are deterministic.
const T_BASELINE = '2024-01-01 00:00:00';
const T_OLD = '2024-01-01 00:00:00';
const T_NEW = '2024-06-01 00:00:00';
const EPOCH_BASELINE = Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000);
const EPOCH_NEWER = Math.floor(Date.parse('2024-07-01T00:00:00Z') / 1000);

function localRow(overrides: Partial<AniListSyncRow> = {}): AniListSyncRow {
  return {
    id: 1,
    anilistId: 100,
    title: 'Test',
    status: 'watching',
    currentEpisode: 3,
    score: null,
    notes: null,
    updatedAt: T_NEW,
    anilistSyncedAt: null,
    anilistRemoteUpdatedAt: null,
    ...overrides,
  };
}

function remoteEntry(overrides: Partial<AniListMediaListEntry> = {}): AniListMediaListEntry {
  return {
    mediaId: 100,
    status: 'CURRENT',
    progress: 3,
    score: null,
    notes: null,
    updatedAt: EPOCH_BASELINE,
    title: 'Test',
    ...overrides,
  };
}

describe('status mapping', () => {
  it('maps AniList statuses to the local vocabulary', () => {
    expect(statusFromAniList('CURRENT')).toBe('watching');
    expect(statusFromAniList('REPEATING')).toBe('watching');
    expect(statusFromAniList('COMPLETED')).toBe('completed');
    expect(statusFromAniList('PLANNING')).toBe('plan_to_watch');
    expect(statusFromAniList('PAUSED')).toBe('on_hold');
    expect(statusFromAniList('DROPPED')).toBe('dropped');
    expect(statusFromAniList(null)).toBe('plan_to_watch');
  });

  it('maps local statuses to the AniList enum', () => {
    expect(statusToAniList('watching')).toBe('CURRENT');
    expect(statusToAniList('completed')).toBe('COMPLETED');
    expect(statusToAniList('plan_to_watch')).toBe('PLANNING');
    expect(statusToAniList('on_hold')).toBe('PAUSED');
    expect(statusToAniList('dropped')).toBe('DROPPED');
  });
});

describe('score mapping', () => {
  it('round-trips local 0–10 ↔ raw 0–100', () => {
    expect(localScoreToRaw(8.5)).toBe(85);
    expect(localScoreToRaw(7)).toBe(70);
    expect(rawScoreToLocal(85)).toBe(8.5);
    expect(rawScoreToLocal(70)).toBe(7);
  });
});

describe('parseLocalMs', () => {
  it('treats a space-separated SQLite datetime as UTC', () => {
    expect(parseLocalMs('2024-01-01 00:00:00')).toBe(Date.parse('2024-01-01T00:00:00Z'));
    expect(parseLocalMs(null)).toBe(0);
  });
});

describe('decideMerge — present-wins (data-loss prevention)', () => {
  it('does NOT push an empty local score/notes over a populated remote; pulls remote instead', () => {
    // First sync: browser-detected local entry (no score/notes) is newer than the
    // year-old AniList entry. Naive entry-level latest-wins would push empty local
    // values over the real AniList score/notes. Present-wins must prevent that.
    const local = localRow({
      score: null,
      notes: null,
      updatedAt: T_NEW,
      anilistSyncedAt: null,
      anilistRemoteUpdatedAt: null,
    });
    const remote = remoteEntry({ score: 85, notes: 'great', updatedAt: EPOCH_BASELINE });

    const decision = decideMerge(local, remote);

    // Local gains the remote score/notes; nothing empty is pushed to AniList.
    expect(decision.localUpdate).toEqual({ score: 8.5, notes: 'great' });
    expect(decision.remotePush).toBeNull();
  });

  it('treats score 0 as unrated (absent) on both sides', () => {
    const local = localRow({ score: 0 });
    const remote = remoteEntry({ score: 0 });
    const decision = decideMerge(local, remote);
    // Neither side has a real score → no score write either way.
    expect(decision.localUpdate).toBeNull();
    expect(decision.remotePush).toBeNull();
  });
});

describe('decideMerge — progress is monotonic', () => {
  it('pulls the higher remote episode even when local is newer', () => {
    const local = localRow({ currentEpisode: 5, updatedAt: T_NEW });
    const remote = remoteEntry({ progress: 8, updatedAt: EPOCH_BASELINE });
    const decision = decideMerge(local, remote);
    expect(decision.localUpdate).toEqual({ currentEpisode: 8 });
    expect(decision.remotePush).toBeNull();
  });

  it('pushes the higher local episode to the remote', () => {
    const local = localRow({ currentEpisode: 10, updatedAt: T_NEW });
    const remote = remoteEntry({ progress: 8, updatedAt: EPOCH_BASELINE });
    const decision = decideMerge(local, remote);
    expect(decision.localUpdate).toBeNull();
    expect(decision.remotePush).toEqual({ progress: 10 });
  });
});

describe('decideMerge — latest-wins arbitration when both present and differ', () => {
  it('only-local-changed → local wins (pushes local)', () => {
    const local = localRow({
      score: 9,
      updatedAt: T_NEW, // changed since baseline
      anilistSyncedAt: T_BASELINE,
      anilistRemoteUpdatedAt: EPOCH_BASELINE, // remote unchanged
    });
    const remote = remoteEntry({ score: 70, updatedAt: EPOCH_BASELINE });
    const decision = decideMerge(local, remote);
    expect(decision.remotePush).toEqual({ scoreRaw: 90 });
    expect(decision.localUpdate).toBeNull();
    expect(decision.conflict).toBe(false);
  });

  it('only-remote-changed → remote wins (pulls remote)', () => {
    const local = localRow({
      score: 8,
      updatedAt: T_OLD, // unchanged since baseline
      anilistSyncedAt: T_BASELINE,
      anilistRemoteUpdatedAt: EPOCH_BASELINE,
    });
    const remote = remoteEntry({ score: 95, updatedAt: EPOCH_NEWER }); // changed
    const decision = decideMerge(local, remote);
    expect(decision.localUpdate).toEqual({ score: 9.5 });
    expect(decision.remotePush).toBeNull();
    expect(decision.conflict).toBe(false);
  });

  it('both changed → newest timestamp wins and flags a conflict', () => {
    // local updatedAt (2024-06-01) is older than remote (2024-07-01) → remote wins.
    const local = localRow({
      score: 9,
      updatedAt: T_NEW,
      anilistSyncedAt: T_BASELINE,
      anilistRemoteUpdatedAt: EPOCH_BASELINE,
    });
    const remote = remoteEntry({ score: 60, updatedAt: EPOCH_NEWER });
    const decision = decideMerge(local, remote);
    expect(decision.localUpdate).toEqual({ score: 6 });
    expect(decision.remotePush).toBeNull();
    expect(decision.conflict).toBe(true);
  });
});

describe('decideMerge — status', () => {
  it('does not churn REPEATING ↔ watching (canonical compare)', () => {
    const local = localRow({ status: 'watching' });
    const remote = remoteEntry({ status: 'REPEATING' });
    const decision = decideMerge(local, remote);
    expect(decision.localUpdate).toBeNull();
    expect(decision.remotePush).toBeNull();
  });

  it('pushes a genuine status change when local is newer (post-baseline)', () => {
    const local = localRow({
      status: 'completed',
      currentEpisode: 12,
      updatedAt: T_NEW,
      anilistSyncedAt: T_BASELINE,
      anilistRemoteUpdatedAt: EPOCH_BASELINE,
    });
    const remote = remoteEntry({ status: 'CURRENT', progress: 12, updatedAt: EPOCH_BASELINE });
    const decision = decideMerge(local, remote);
    expect(decision.remotePush).toEqual({ status: 'COMPLETED' });
    expect(decision.localUpdate).toBeNull();
  });

  it('on FIRST CONTACT a status conflict resolves in AniList’s favor (no push, not a conflict)', () => {
    // COMPLETED on AniList; browser detection set it to "watching" locally with a
    // fresh timestamp. The first sync (null baselines) must adopt AniList rather
    // than flip the real COMPLETED → CURRENT just because the local row is "newer".
    const local = localRow({
      status: 'watching',
      currentEpisode: 24,
      updatedAt: T_NEW,
      anilistSyncedAt: null,
      anilistRemoteUpdatedAt: null,
    });
    const remote = remoteEntry({ status: 'COMPLETED', progress: 24, updatedAt: EPOCH_BASELINE });
    const decision = decideMerge(local, remote);
    expect(decision.remotePush).toBeNull(); // AniList COMPLETED preserved
    expect(decision.localUpdate).toEqual({ status: 'completed' }); // local adopts it
    expect(decision.conflict).toBe(false); // first contact is not a conflict
  });
});

describe('decideMerge — unchanged', () => {
  it('returns no writes when both sides already agree', () => {
    const local = localRow({
      status: 'watching',
      currentEpisode: 5,
      score: 8,
      notes: 'ok',
      anilistSyncedAt: T_BASELINE,
      anilistRemoteUpdatedAt: EPOCH_BASELINE,
      updatedAt: T_OLD,
    });
    const remote = remoteEntry({
      status: 'CURRENT',
      progress: 5,
      score: 80,
      notes: 'ok',
      updatedAt: EPOCH_BASELINE,
    });
    const decision = decideMerge(local, remote);
    expect(decision.localUpdate).toBeNull();
    expect(decision.remotePush).toBeNull();
    expect(decision.conflict).toBe(false);
  });
});

describe('buildAddPayloadFromRemote', () => {
  it('maps a populated remote entry, dropping unrated score and blank notes', () => {
    const remote = remoteEntry({
      mediaId: 555,
      status: 'COMPLETED',
      progress: 24,
      score: 0, // unrated
      notes: '', // blank
      episodes: 24,
      title: 'Done',
      titleRomaji: 'Done R',
    });
    expect(buildAddPayloadFromRemote(remote)).toEqual({
      anilistId: 555,
      title: 'Done',
      titleRomaji: 'Done R',
      titleNative: undefined,
      coverImage: undefined,
      episodes: 24,
      status: 'completed',
      currentEpisode: 24,
      score: undefined,
      notes: undefined,
    });
  });

  it('imports a real remote score/notes', () => {
    const payload = buildAddPayloadFromRemote(
      remoteEntry({ score: 73, notes: '  loved it  ', progress: null })
    );
    expect(payload.score).toBe(7.3);
    expect(payload.notes).toBe('loved it');
    expect(payload.currentEpisode).toBe(0);
  });
});

describe('buildPullUpdateFromRemote (forced pull, remote wins)', () => {
  it('adopts every present remote value, including a LOWER progress', () => {
    const local = localRow({ status: 'completed', currentEpisode: 12, score: 9, notes: 'mine' });
    const remote = remoteEntry({
      status: 'CURRENT',
      progress: 3,
      score: 70,
      notes: 'theirs',
    });
    expect(buildPullUpdateFromRemote(local, remote)).toEqual({
      status: 'watching',
      currentEpisode: 3,
      score: 7,
      notes: 'theirs',
    });
  });

  it('never clears a populated local field when the remote lacks it', () => {
    const local = localRow({ status: 'watching', currentEpisode: 5, score: 8, notes: 'keep' });
    const remote = remoteEntry({
      status: 'CURRENT',
      progress: null, // absent remotely → must not clobber local 5 to absent
      score: 0, // unrated → absent
      notes: '', // blank → absent
    });
    // Only status matches already; nothing else changes → null (no write).
    expect(buildPullUpdateFromRemote(local, remote)).toBeNull();
  });

  it('returns null when local already matches the remote', () => {
    const local = localRow({ status: 'watching', currentEpisode: 3, score: 8, notes: 'ok' });
    const remote = remoteEntry({ status: 'CURRENT', progress: 3, score: 80, notes: 'ok' });
    expect(buildPullUpdateFromRemote(local, remote)).toBeNull();
  });
});

describe('buildPushInputFromLocal', () => {
  it('omits scoreRaw/notes when the local values are absent (never sends 0/blank)', () => {
    const input = buildPushInputFromLocal(
      localRow({ anilistId: 100, status: 'on_hold', currentEpisode: 4, score: 0, notes: '   ' })
    );
    expect(input).toEqual({ mediaId: 100, status: 'PAUSED', progress: 4 });
    expect(input).not.toHaveProperty('scoreRaw');
    expect(input).not.toHaveProperty('notes');
  });

  it('includes scoreRaw/notes when present', () => {
    const input = buildPushInputFromLocal(
      localRow({ anilistId: 100, status: 'completed', currentEpisode: 12, score: 9, notes: 'gg' })
    );
    expect(input).toEqual({
      mediaId: 100,
      status: 'COMPLETED',
      progress: 12,
      scoreRaw: 90,
      notes: 'gg',
    });
  });
});
