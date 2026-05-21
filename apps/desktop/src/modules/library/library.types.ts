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
