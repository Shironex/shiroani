/**
 * Pure reconciliation logic for two-way MyAnimeList sync.
 *
 * The MAL twin of `anilist-sync/reconcile.ts` — same conflict policy, but it
 * reads the MAL baselines (`malSyncedAt` / `malRemoteUpdatedAt`) and speaks
 * MAL's already-canonical-local vocabulary, so it must NOT be confused with the
 * AniList reconciler (which is AniList-wire-coupled: UPPERCASE status, 0–100
 * score, and the AniList baseline columns). This is the deliberate separation
 * called out in the engine handoff: "reconcile stays unchanged" means the
 * AniList one is not modified, NOT that MAL reuses it.
 *
 * No I/O, no Nest, no DB, no network — every function here is deterministic so
 * the conflict matrix can be unit-tested exhaustively. The adapter layer
 * (`mal-sync.adapter.ts`) wraps these with the actual reads/writes.
 *
 * Design contract (mirrors AniList, locked with the user):
 *  - Conflict policy: auto-merge, latest-`updatedAt` wins. Progress is monotonic
 *    (always `max`). For score/status, latest-wins arbitrates ONLY when both
 *    sides are present AND differ AND both changed since the last sync.
 *  - Present-wins: if one side is absent (0-score), the present side wins
 *    regardless of timestamp. This stops the first sync from pushing an empty
 *    local score over a populated MAL value.
 *  - Score 0 means "unrated" on both sides, so it is treated as ABSENT. MAL
 *    scores are integers 0–10 — already canonical-local, no ×10/÷10.
 *  - On first contact (no prior MAL baseline), conflicts resolve in MAL's favor
 *    (you're adopting an established MAL list).
 *
 * MAL list entries carry NO notes/comments through the Wave-6 client, so the MAL
 * merge reconciles status / score / progress only (no notes field).
 */

import type { AnimeStatus } from '@shiroani/shared';
import type { AniListSyncRow } from '../library/library.types';
import type { MalListEntry, MalUpdateListStatusInput } from '../anime/mal-client';

/** Local-side fields a MAL pull may write (subset of LibraryUpdatePayload). */
export interface MalLocalUpdate {
  status?: AnimeStatus;
  currentEpisode?: number;
  score?: number;
}

/** Remote-side fields a MAL push may write (updateListStatus input minus malId). */
export type MalRemotePush = Omit<MalUpdateListStatusInput, 'malId'>;

export interface MalMergeDecision {
  /** Fields to write to the local row (null = no local change). */
  localUpdate: MalLocalUpdate | null;
  /** Fields to write to the MAL entry (null = no remote change). */
  remotePush: MalRemotePush | null;
  /** True when both sides changed since baseline and a value was arbitrated by timestamp. */
  conflict: boolean;
}

/**
 * Parse a SQLite `datetime('now')` string (`'YYYY-MM-DD HH:MM:SS'`, UTC) to epoch
 * ms. The space→'T' + 'Z' normalization is required: a bare space-separated
 * datetime is parsed as LOCAL time by `Date.parse`, which would skew comparisons
 * against MAL's UTC epoch seconds. Mirrors the AniList reconciler's `parseLocalMs`.
 */
export function parseLocalMs(value: string | null | undefined): number {
  if (!value) return 0;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/** A score counts as "set" only when present and > 0 (0 = unrated on MAL). */
function scorePresent(score: number | null | undefined): boolean {
  return score != null && score > 0;
}

interface FieldMergeResult<T> {
  value: T | null;
  /** Both sides were present and their values differed. */
  differed: boolean;
}

/**
 * Merge one field. Present-wins for null asymmetry. For a genuine both-present
 * conflict: first contact → MAL wins; once baselines exist, latest-`updatedAt`
 * (`localNewer`) arbitrates, gated by which side actually changed since baseline.
 * Identical logic to the AniList reconciler's `mergeField`.
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
  // Neither side edited since baseline: the difference is representational
  // (MAL stores integer scores, so a pushed 7.5 reads back as 8). Keep local —
  // arbitrating by timestamp would pull the rounded value over the user's
  // fractional rating and re-push it to AniList as a fresh edit.
  else if (!localChanged && !remoteChanged) winner = local as T;
  else winner = localNewer ? (local as T) : (remote as T);
  return { value: winner, differed: true };
}

/**
 * Decide how to reconcile a local row that matches a MAL entry (same MAL id).
 * Returns the local write, the remote write, and whether a real conflict was
 * arbitrated. Either side may be written, both, or neither. MAL values are
 * already canonical-local (status 1:1, score 0–10), so there is no wire mapping
 * here beyond present/absent handling.
 */
export function decideMalMerge(local: AniListSyncRow, remote: MalListEntry): MalMergeDecision {
  const localMs = parseLocalMs(local.updatedAt);
  const remoteMs = (remote.updatedAt ?? 0) * 1000;

  // First contact = never reconciled before (both MAL baselines null). On the
  // very first sync, conflicts resolve in MAL's favor (you're adopting an
  // established list); latest-wins only kicks in once baselines exist.
  const firstContact = local.malSyncedAt == null && local.malRemoteUpdatedAt == null;
  const localChanged = local.malSyncedAt == null ? true : localMs > parseLocalMs(local.malSyncedAt);
  const remoteChanged =
    local.malRemoteUpdatedAt == null ? true : (remote.updatedAt ?? 0) > local.malRemoteUpdatedAt;
  const localNewer = localMs >= remoteMs;

  // --- status (canonical / local vocabulary; local always present) ---
  const statusMerge = mergeField(
    local.status,
    remote.status,
    firstContact,
    localChanged,
    remoteChanged,
    localNewer
  );
  const mergedStatus = (statusMerge.value ?? local.status) as AnimeStatus;

  // --- score (local 0–10 space on both sides; absent = null) ---
  const localScore = scorePresent(local.score) ? (local.score as number) : null;
  const remoteScore = scorePresent(remote.score) ? remote.score : null;
  const scoreMerge = mergeField(
    localScore,
    remoteScore,
    firstContact,
    localChanged,
    remoteChanged,
    localNewer
  );
  const mergedScore = scoreMerge.value; // 0–10 or null

  // --- progress (monotonic) ---
  const remoteProgress = remote.progress ?? 0;
  const mergedProgress = Math.max(local.currentEpisode, remoteProgress);

  // --- build local update (pull) ---
  const localUpdate: MalLocalUpdate = {};
  if (mergedStatus !== local.status) localUpdate.status = mergedStatus;
  if (mergedProgress !== local.currentEpisode) localUpdate.currentEpisode = mergedProgress;
  if (mergedScore != null && mergedScore !== localScore) localUpdate.score = mergedScore;

  // --- build remote push ---
  const remotePush: MalRemotePush = {};
  if (mergedStatus !== remote.status) remotePush.status = mergedStatus;
  if (mergedProgress !== remoteProgress) remotePush.progress = mergedProgress;
  // OMIT score when 0/unrated (never send score:0 as a rating). Round to int —
  // and guard the ROUNDED value too: a fractional score < 0.5 (e.g. an AniList
  // 4/100 → 0.4 carried through a cross-provider edit) rounds to 0, which would
  // otherwise leak a 0-rating push. Only push a rounded score that is still > 0.
  if (mergedScore != null) {
    const roundedLocal = Math.round(mergedScore);
    const roundedRemote = scorePresent(remote.score) ? Math.round(remote.score) : 0;
    if (roundedLocal > 0 && roundedLocal !== roundedRemote) remotePush.score = roundedLocal;
  }

  const progressDiffered = local.currentEpisode !== remoteProgress;
  // A "conflict" means both sides changed since a PRIOR agreement. First contact
  // has no prior agreement, so its differences are initial reconciliation.
  const conflict =
    !firstContact &&
    localChanged &&
    remoteChanged &&
    (statusMerge.differed || scoreMerge.differed || progressDiffered);

  return {
    localUpdate: Object.keys(localUpdate).length > 0 ? localUpdate : null,
    remotePush: Object.keys(remotePush).length > 0 ? remotePush : null,
    conflict,
  };
}

/**
 * Build a FORCED-PULL local update from a MAL entry (remote wins, no merge).
 *
 * Unlike {@link decideMalMerge}, this bypasses latest-wins / monotonic-progress
 * arbitration — MAL's values are adopted regardless of timestamps. But it keeps
 * the same invariant the AniList force-pull does: it never CLEARS a populated
 * local value to absent just because MAL lacks it. status is always present
 * remotely; progress is adopted even if lower (real lower remote value), but
 * an unrated remote score (0) never wipes a populated local score. Returns null
 * when nothing would change (caller reports 'unchanged').
 */
export function buildMalPullUpdate(
  local: AniListSyncRow,
  remote: MalListEntry
): MalLocalUpdate | null {
  const update: MalLocalUpdate = {};

  // status is always present on MAL → always adoptable.
  if (remote.status !== local.status) update.status = remote.status;

  // progress: adopt the present remote value even if lower; never clear to absent.
  if (remote.progress !== local.currentEpisode) update.currentEpisode = remote.progress;

  // score: a forced pull only writes a REAL remote rating (>0); an unrated
  // remote (0) must NOT wipe a populated local score.
  if (scorePresent(remote.score) && remote.score !== (local.score ?? 0)) {
    update.score = remote.score;
  }

  return Object.keys(update).length > 0 ? update : null;
}

/**
 * Build the local insert payload from a MAL-only entry (import direction). The
 * created row is keyed by `malId`; score is omitted when unrated (0).
 */
export function buildMalAddPayload(remote: MalListEntry): {
  malId: number;
  title: string;
  status: AnimeStatus;
  currentEpisode: number;
  score?: number;
  coverImage?: string;
} {
  return {
    malId: remote.mediaId,
    title: remote.title || `MAL #${remote.mediaId}`,
    status: remote.status,
    currentEpisode: remote.progress,
    score: scorePresent(remote.score) ? remote.score : undefined,
    coverImage: remote.coverImage,
  };
}

/**
 * Build the create-on-MAL input from a local-only entry (push direction).
 * Caller guarantees `local.malId` is non-null. Score is OMITTED when unrated
 * (0) so an empty local rating never writes a 0 to MAL.
 */
export function buildMalPushInput(local: AniListSyncRow): MalUpdateListStatusInput {
  const input: MalUpdateListStatusInput = {
    malId: local.malId as number,
    status: local.status,
    progress: local.currentEpisode,
  };
  // Guard the ROUNDED value (not just scorePresent): a fractional score < 0.5
  // rounds to 0, and we must never push a 0-rating (the omit-unrated rule).
  if (scorePresent(local.score)) {
    const rounded = Math.round(local.score as number);
    if (rounded > 0) input.score = rounded;
  }
  return input;
}
