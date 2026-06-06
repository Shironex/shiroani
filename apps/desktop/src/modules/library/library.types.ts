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
}

/** Map a database row to the {@link AniListSyncRow} reconciliation projection. */
export function rowToSyncRow(row: AnimeLibraryRow): AniListSyncRow {
  return {
    id: row.id,
    anilistId: row.anilist_id,
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
  };
}
