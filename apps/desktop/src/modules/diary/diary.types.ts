import type { DiaryEntry } from '@shiroani/shared';

/** Raw row shape returned by better-sqlite3 for the diary_entries table. */
export interface DiaryRow {
  id: number;
  title: string;
  content_json: string;
  cover_gradient: string | null;
  mood: string | null;
  tags: string | null;
  anime_id: number | null;
  anime_title: string | null;
  anime_cover_image: string | null;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

/** Map a database row to the shared DiaryEntry type. */
export function rowToEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    title: row.title,
    contentJson: row.content_json,
    coverGradient: (row.cover_gradient as DiaryEntry['coverGradient']) ?? undefined,
    mood: (row.mood as DiaryEntry['mood']) ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    animeId: row.anime_id ?? undefined,
    animeTitle: row.anime_title ?? undefined,
    animeCoverImage: row.anime_cover_image ?? undefined,
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
