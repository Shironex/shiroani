import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';

/** Raw row shape returned by better-sqlite3 for the anime_library table. */
export interface AnimeLibraryRow {
  id: number;
  anilist_id: number | null;
  title: string;
  title_romaji: string | null;
  title_native: string | null;
  cover_image: string | null;
  total_episodes: number | null;
  status: string;
  current_episode: number;
  score: number | null;
  notes: string | null;
  resume_url: string | null;
  added_at: string;
  updated_at: string;
  // AniList sync baselines (migration v13). Null until first reconcile.
  anilist_synced_at: string | null;
  anilist_remote_updated_at: number | null;
  // MyAnimeList id + sync baselines (migration v14). All null until linked/synced.
  mal_id: number | null;
  mal_synced_at: string | null;
  mal_remote_updated_at: number | null;
}

/**
 * Library entry projected for AniList reconciliation — carries the sync
 * baselines (`anilistSyncedAt` / `anilistRemoteUpdatedAt`) that the shared
 * {@link AnimeEntry} deliberately omits (they are main-side sync internals and
 * must never cross the socket). Produced by `LibraryService.getEntriesForSync`.
 */
export interface AniListSyncRow {
  id: number;
  anilistId: number | null;
  /**
   * The linked MyAnimeList id, or null. Carried here so a future MAL reconcile
   * can reuse this projection without a second query — AniList sync ignores it.
   * Optional in the type; `rowToSyncRow` (the only producer) always sets it.
   */
  malId?: number | null;
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  coverImage?: string;
  episodes?: number;
  status: AnimeStatus;
  currentEpisode: number;
  score: number | null;
  notes: string | null;
  /** Local clock of the last write to this row (datetime('now') format, UTC). */
  updatedAt: string;
  /** Local clock at the last successful reconcile, or null if never synced. */
  anilistSyncedAt: string | null;
  /** AniList entry `updatedAt` (epoch seconds) at the last reconcile, or null. */
  anilistRemoteUpdatedAt: number | null;
  /**
   * Local clock at the last successful MAL reconcile, or null if never synced.
   * Mirrors {@link anilistSyncedAt} for the MAL provider (migration v14). Optional
   * in the type; `rowToSyncRow` (the only producer) always sets it. The AniList
   * sync ignores these fields — they exist so the generic sync engine can read
   * the MAL baseline via the same projection without a second query.
   */
  malSyncedAt?: string | null;
  /** MAL entry `updated_at` (epoch seconds) at the last reconcile, or null. */
  malRemoteUpdatedAt?: number | null;
}

/**
 * Parse a SQLite `datetime('now')` string (`'YYYY-MM-DD HH:MM:SS'`, UTC) to epoch
 * ms, or null when absent. Inlined here (rather than importing the reconciler's
 * `parseLocalMs`) so `library` keeps no dependency on `anilist-sync` — the
 * dependency only runs the other way. The space→'T' + 'Z' normalization is
 * required: a bare space-separated datetime would otherwise be parsed as LOCAL
 * time.
 */
function syncedAtToMs(value: string | null): number | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Map a database row to the {@link AniListSyncRow} reconciliation projection. */
export function rowToSyncRow(row: AnimeLibraryRow): AniListSyncRow {
  return {
    id: row.id,
    anilistId: row.anilist_id,
    malId: row.mal_id,
    title: row.title,
    titleRomaji: row.title_romaji ?? undefined,
    titleNative: row.title_native ?? undefined,
    coverImage: row.cover_image ?? undefined,
    episodes: row.total_episodes ?? undefined,
    status: row.status as AnimeStatus,
    currentEpisode: row.current_episode,
    score: row.score,
    notes: row.notes,
    updatedAt: row.updated_at,
    anilistSyncedAt: row.anilist_synced_at,
    anilistRemoteUpdatedAt: row.anilist_remote_updated_at,
    malSyncedAt: row.mal_synced_at,
    malRemoteUpdatedAt: row.mal_remote_updated_at,
  };
}

/** Map a database row to the shared AnimeEntry type. */
export function rowToEntry(row: AnimeLibraryRow): AnimeEntry {
  return {
    id: row.id,
    anilistId: row.anilist_id ?? undefined,
    title: row.title,
    titleRomaji: row.title_romaji ?? undefined,
    titleNative: row.title_native ?? undefined,
    coverImage: row.cover_image ?? undefined,
    episodes: row.total_episodes ?? undefined,
    status: row.status as AnimeStatus,
    currentEpisode: row.current_episode,
    score: row.score ?? undefined,
    notes: row.notes ?? undefined,
    resumeUrl: row.resume_url ?? undefined,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    anilistSyncedAt: syncedAtToMs(row.anilist_synced_at),
    synced: row.anilist_synced_at != null,
    malId: row.mal_id,
    malSyncedAt: syncedAtToMs(row.mal_synced_at),
    malSynced: row.mal_synced_at != null,
  };
}
