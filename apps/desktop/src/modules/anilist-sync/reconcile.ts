/**
 * Pure reconciliation logic for two-way AniList sync.
 *
 * No I/O, no Nest, no DB, no network — every function here is deterministic so
 * the conflict matrix can be unit-tested exhaustively. The service layer
 * (`anilist-sync.service.ts`) wraps these with the actual reads/writes.
 *
 * Design contract (locked with the user):
 *  - Conflict policy: auto-merge, latest-`updatedAt` wins. Progress is monotonic
 *    (always `max`). For score/status/notes, latest-wins arbitrates ONLY when
 *    both sides are present AND differ AND both changed since the last sync.
 *  - Present-wins: if one side is absent (null/empty/0-score), the present side
 *    wins regardless of timestamp. This is what stops the first sync from pushing
 *    an empty local score/notes over a populated AniList value.
 *  - Score 0 means "unrated" on both sides, so it is treated as ABSENT.
 *  - REPEATING (no local equivalent) maps to `watching` on import; a local
 *    `watching` is considered equal to a remote REPEATING (canonical compare), so
 *    sync never downgrades REPEATING → CURRENT on its own.
 */

import type { AnimeStatus, LibraryAddPayload } from '@shiroani/shared';
import type { AniListSyncRow } from '../library/library.types';
import type {
  AniListMediaListEntry,
  AniListMediaListStatus,
  SaveMediaListEntryInput,
} from '../anime/types';

/** Local-side fields a pull may write (subset of LibraryUpdatePayload). */
export interface LocalUpdate {
  status?: AnimeStatus;
  currentEpisode?: number;
  score?: number;
  notes?: string;
}

/** Remote-side fields a push may write (SaveMediaListEntry input minus mediaId). */
export type RemotePush = Omit<SaveMediaListEntryInput, 'mediaId'>;

export interface MergeDecision {
  /** Fields to write to the local row (null = no local change). */
  localUpdate: LocalUpdate | null;
  /** Fields to write to the AniList entry (null = no remote change). */
  remotePush: RemotePush | null;
  /** True when both sides changed since baseline and a value was arbitrated by timestamp. */
  conflict: boolean;
}

const STATUS_TO_ANILIST: Record<AnimeStatus, AniListMediaListStatus> = {
  watching: 'CURRENT',
  completed: 'COMPLETED',
  plan_to_watch: 'PLANNING',
  on_hold: 'PAUSED',
  dropped: 'DROPPED',
};

/** Map an AniList list status to the local vocabulary (REPEATING → watching). */
export function statusFromAniList(status: AniListMediaListStatus | null): AnimeStatus {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'PLANNING':
      return 'plan_to_watch';
    case 'PAUSED':
      return 'on_hold';
    case 'DROPPED':
      return 'dropped';
    case 'CURRENT':
    case 'REPEATING':
      return 'watching';
    default:
      // null / unknown — safest neutral bucket.
      return 'plan_to_watch';
  }
}

/** Map a local status to the AniList enum. */
export function statusToAniList(status: AnimeStatus): AniListMediaListStatus {
  return STATUS_TO_ANILIST[status];
}

/** Local score (0–10) → AniList raw score (0–100). */
export function localScoreToRaw(score: number): number {
  return Math.round(score * 10);
}

/** AniList raw score (0–100) → local score (0–10, one decimal). */
export function rawScoreToLocal(raw: number): number {
  return Math.round(raw) / 10;
}

/** A score counts as "set" only when present and > 0 (0 = unrated on AniList). */
function scorePresent(score: number | null | undefined): boolean {
  return score != null && score > 0;
}

/** Notes count as "set" only when present and non-blank. */
function notesPresent(notes: string | null | undefined): boolean {
  return notes != null && notes.trim().length > 0;
}

/**
 * Parse a SQLite `datetime('now')` string (`'YYYY-MM-DD HH:MM:SS'`, UTC) to epoch
 * ms. The space→'T' + 'Z' normalization is required: a bare space-separated
 * datetime is parsed as LOCAL time by `Date.parse`, which would skew comparisons
 * against AniList's UTC epoch seconds.
 */
export function parseLocalMs(value: string | null): number {
  if (!value) return 0;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

interface FieldMergeResult<T> {
  value: T | null;
  /** Both sides were present and their values differed. */
  differed: boolean;
}

/**
 * Merge one field. Present-wins for null asymmetry. For a genuine both-present
 * conflict:
 *  - On FIRST CONTACT (no prior sync baseline) AniList wins. A null baseline
 *    means the local `updatedAt` is just "when ShiroAni last touched the row",
 *    not a meaningful edit time relative to AniList — so latest-wins can't
 *    arbitrate yet, and the user is adopting an established AniList list. This is
 *    what stops a first sync from flipping an AniList `COMPLETED` to `watching`
 *    just because browser detection bumped the local row recently. `status` is
 *    never null, so this branch (not present-wins) is what protects it.
 *  - Once baselines exist, latest-`updatedAt` (`localNewer`) arbitrates, gated by
 *    which side actually changed since the baseline.
 */
function mergeField<T>(
  local: T | null,
  remote: T | null,
  firstContact: boolean,
  localChanged: boolean,
  remoteChanged: boolean,
  localNewer: boolean
): FieldMergeResult<T> {
  const lp = local != null;
  const rp = remote != null;

  if (lp && !rp) return { value: local, differed: false };
  if (rp && !lp) return { value: remote, differed: false };
  if (!lp && !rp) return { value: null, differed: false };
  if (local === remote) return { value: local, differed: false };

  // Both present and differ.
  let winner: T;
  if (firstContact) winner = remote as T;
  else if (localChanged && !remoteChanged) winner = local as T;
  else if (remoteChanged && !localChanged) winner = remote as T;
  else winner = localNewer ? (local as T) : (remote as T);
  return { value: winner, differed: true };
}

/**
 * Decide how to reconcile a local row that matches a remote entry (same AniList
 * id). Returns the local write, the remote write, and whether a real conflict
 * was arbitrated. Either side may be written, both, or neither.
 */
export function decideMerge(local: AniListSyncRow, remote: AniListMediaListEntry): MergeDecision {
  const localMs = parseLocalMs(local.updatedAt);
  const remoteMs = remote.updatedAt * 1000;

  // First contact = never reconciled before (both baselines null). On the very
  // first sync, conflicts resolve in AniList's favor (you're adopting an
  // established list); latest-wins only kicks in once baselines exist.
  const firstContact = local.anilistSyncedAt == null && local.anilistRemoteUpdatedAt == null;
  const localChanged =
    local.anilistSyncedAt == null ? true : localMs > parseLocalMs(local.anilistSyncedAt);
  const remoteChanged =
    local.anilistRemoteUpdatedAt == null ? true : remote.updatedAt > local.anilistRemoteUpdatedAt;
  const localNewer = localMs >= remoteMs;

  // --- status (canonical / local vocabulary; local always present) ---
  const remoteStatusCanonical = remote.status ? statusFromAniList(remote.status) : null;
  const statusMerge = mergeField(
    local.status,
    remoteStatusCanonical,
    firstContact,
    localChanged,
    remoteChanged,
    localNewer
  );
  const mergedStatus = (statusMerge.value ?? local.status) as AnimeStatus;

  // --- score (compare in local 0–10 space; absent = null) ---
  const localScore = scorePresent(local.score) ? local.score : null;
  const remoteScoreLocal = scorePresent(remote.score)
    ? rawScoreToLocal(remote.score as number)
    : null;
  const scoreMerge = mergeField(
    localScore,
    remoteScoreLocal,
    firstContact,
    localChanged,
    remoteChanged,
    localNewer
  );
  const mergedScore = scoreMerge.value; // 0–10 or null

  // --- notes (trimmed; absent = null) ---
  const localNotes = notesPresent(local.notes) ? (local.notes as string).trim() : null;
  const remoteNotes = notesPresent(remote.notes) ? (remote.notes as string).trim() : null;
  const notesMerge = mergeField(
    localNotes,
    remoteNotes,
    firstContact,
    localChanged,
    remoteChanged,
    localNewer
  );
  const mergedNotes = notesMerge.value;

  // --- progress (monotonic) ---
  const remoteProgress = remote.progress ?? 0;
  const mergedProgress = Math.max(local.currentEpisode, remoteProgress);

  // --- build local update (pull) ---
  const localUpdate: LocalUpdate = {};
  if (mergedStatus !== local.status) localUpdate.status = mergedStatus;
  if (mergedProgress !== local.currentEpisode) localUpdate.currentEpisode = mergedProgress;
  if (mergedScore != null && mergedScore !== localScore) localUpdate.score = mergedScore;
  if (mergedNotes != null && mergedNotes !== localNotes) localUpdate.notes = mergedNotes;

  // --- build remote push (canonical compares so REPEATING/CURRENT don't churn) ---
  const remotePush: RemotePush = {};
  if (mergedStatus !== remoteStatusCanonical) remotePush.status = statusToAniList(mergedStatus);
  if (mergedProgress !== remoteProgress) remotePush.progress = mergedProgress;
  if (mergedScore != null) {
    const raw = localScoreToRaw(mergedScore);
    const remoteRaw = scorePresent(remote.score) ? Math.round(remote.score as number) : 0;
    if (raw !== remoteRaw) remotePush.scoreRaw = raw;
  }
  if (mergedNotes != null && mergedNotes !== remoteNotes) remotePush.notes = mergedNotes;

  const progressDiffered = local.currentEpisode !== remoteProgress;
  // A "conflict" means both sides changed since a PRIOR agreement. First contact
  // has no prior agreement, so its differences are initial reconciliation, not
  // conflicts — counting them would inflate the tally to ~every entry on sync 1.
  const conflict =
    !firstContact &&
    localChanged &&
    remoteChanged &&
    (statusMerge.differed || scoreMerge.differed || notesMerge.differed || progressDiffered);

  return {
    localUpdate: Object.keys(localUpdate).length > 0 ? localUpdate : null,
    remotePush: Object.keys(remotePush).length > 0 ? remotePush : null,
    conflict,
  };
}

/** Build a local insert payload from a remote-only entry (import direction). */
export function buildAddPayloadFromRemote(remote: AniListMediaListEntry): LibraryAddPayload {
  return {
    anilistId: remote.mediaId,
    title: remote.title,
    titleRomaji: remote.titleRomaji,
    titleNative: remote.titleNative,
    coverImage: remote.coverImage,
    episodes: remote.episodes,
    status: statusFromAniList(remote.status),
    currentEpisode: remote.progress ?? 0,
    score: scorePresent(remote.score) ? rawScoreToLocal(remote.score as number) : undefined,
    notes: notesPresent(remote.notes) ? (remote.notes as string).trim() : undefined,
  };
}

/**
 * Build the create-on-AniList input from a local-only entry (push direction).
 * Caller guarantees `local.anilistId` is non-null. Score/notes are omitted when
 * absent so an empty local field never writes a 0/blank to AniList.
 */
export function buildPushInputFromLocal(local: AniListSyncRow): SaveMediaListEntryInput {
  const input: SaveMediaListEntryInput = {
    mediaId: local.anilistId as number,
    status: statusToAniList(local.status),
    progress: local.currentEpisode,
  };
  if (scorePresent(local.score)) input.scoreRaw = localScoreToRaw(local.score as number);
  if (notesPresent(local.notes)) input.notes = (local.notes as string).trim();
  return input;
}
