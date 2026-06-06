/**
 * North-star abstraction over an external anime tracker (AniList, MyAnimeList).
 *
 * IMPORTANT — this interface has ZERO consumers today. It is a deliberate
 * forward-declaration of the seam both providers will eventually implement; the
 * shipped AniList sync (merged via #147) is NOT refactored onto it. Expect to
 * revise these signatures when the MAL adapter is actually built (P5) and the
 * real call sites apply pressure — treat this as a sketch, not a frozen contract.
 *
 * CANONICAL-LOCAL ONLY. Every value crossing this interface is expressed in the
 * app's own vocabulary, never a provider's wire format:
 *
 *   - `score`  is the LOCAL 0–10 number. NOT AniList POINT_100 (0–100) and NOT a
 *     MAL integer-only score. Each adapter converts at its OWN boundary
 *     (AniList: ×10 / ÷10 with one-decimal precision; MAL: Math.round, lossy on
 *     half-points). `0` means unrated on both sides — never push it as a rating.
 *   - `status` is the local {@link AnimeStatus} union. NOT AniList's UPPERCASE
 *     MediaListStatus and NOT MAL's snake_case strings (which happen to match
 *     the local vocabulary 1:1, but the adapter still owns the mapping so the
 *     core never depends on the coincidence).
 *   - timestamps are epoch SECONDS. AniList already returns seconds; the MAL
 *     adapter must convert its ISO-8601 `updated_at` to seconds at its boundary.
 *
 * BACKFILL CAVEAT (mal_id ← AniList `Media.idMal`). `Media.idMal` is NULLABLE
 * and NOT guaranteed unique across entries, while the local `mal_id` column has
 * a UNIQUE index (migration v14). So a backfill pass CAN encounter two AniList
 * rows reporting the same `idMal` — the second write hits the UNIQUE constraint.
 * Callers MUST catch that one row, skip+log it, and CONTINUE the run; they must
 * NEVER let a single duplicate abort the whole backfill. This is the same
 * dedup-by-id defensive shape the shipped AniList sync already uses to survive
 * the UNIQUE `anilist_id` constraint — reuse it, do not invent a new strategy.
 */

import type { AnimeStatus } from './anime';

/** Which tracker an adapter speaks to. */
export type TrackerProviderId = 'anilist' | 'mal';

/** Whether the provider is currently connected, and (if so) who. */
export interface TrackerAuthStatus {
  connected: boolean;
  /** Present only when connected. */
  viewer?: TrackerViewer;
}

/** The connected account, in provider-agnostic shape. */
export interface TrackerViewer {
  id: number;
  name: string;
  avatar?: string;
}

/**
 * One entry on the provider's list, normalized to canonical-local values. The
 * `mediaId` is the PROVIDER's media id (AniList id or MAL id) — the only
 * provider-specific identifier the core must carry, since it's the write target.
 */
export interface TrackerListEntry {
  /** Provider media id (AniList id for the AniList adapter, MAL id for MAL). */
  mediaId: number;
  /** Local status vocabulary — adapter has already mapped from the wire enum. */
  status: AnimeStatus;
  /** Episodes watched. */
  progress: number;
  /** Local 0–10 score; 0 = unrated. */
  score: number;
  notes?: string;
  /** Provider entry `updatedAt` as epoch SECONDS (MAL adapter converts ISO). */
  updatedAt: number | null;
}

/**
 * Create-or-update input for a single entry, in canonical-local values. Absent
 * optional fields are left untouched on the remote (do not overwrite with a
 * default). `score: 0` is unrated — adapters must not push it as a rating.
 */
export interface TrackerUpsertEntryInput {
  /** Provider media id to write. */
  mediaId: number;
  status?: AnimeStatus;
  progress?: number;
  /** Local 0–10 score. Omit to leave the remote score unchanged. */
  score?: number;
  notes?: string;
}

/**
 * The seam AniList and MAL adapters will both implement. Provider-specific
 * concerns (OAuth flow, PKCE, refresh loop, REST-vs-GraphQL transport, enum and
 * score conversion) live entirely INSIDE each adapter; the sync core sees only
 * canonical-local values.
 */
export interface TrackerProvider {
  /** Which tracker this is — lets the core feature-gate and label per provider. */
  readonly providerId: TrackerProviderId;

  /** Connection status without forcing a network round-trip when avoidable. */
  getAuthStatus(): Promise<TrackerAuthStatus>;

  /** The connected account, or null when not connected. */
  getViewer(): Promise<TrackerViewer | null>;

  /** The viewer's full list, normalized to canonical-local entries. */
  getList(): Promise<TrackerListEntry[]>;

  /**
   * Create or update one entry from canonical-local input. Resolves to the
   * remote `updatedAt` (epoch seconds) the provider stamped, or null when not
   * connected so the caller can no-op rather than treat it as an error.
   */
  upsertEntry(input: TrackerUpsertEntryInput): Promise<number | null>;

  /** Remove the entry for `mediaId`. Idempotent: a missing entry is success. */
  deleteEntry(mediaId: number): Promise<void>;
}
