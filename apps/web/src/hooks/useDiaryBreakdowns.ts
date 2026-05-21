import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { AnimeDetail, AnimeEntry, DiaryEntry, UserProfile } from '@shiroani/shared';

/**
 * Subset of the canonical `AnimeDetail` — only the fields we aggregate on.
 * Lets the hook consume a future detail cache without re-deriving the shape.
 */
type DiaryAnimeDetailLike = Pick<AnimeDetail, 'genres' | 'studios'>;

export interface DiaryBreakdowns {
  genres: UserProfile['statistics']['genres'];
  studios: UserProfile['statistics']['studios'];
}

const EMPTY_BREAKDOWNS: DiaryBreakdowns = { genres: [], studios: [] };

const GENRE_LIMIT = 8;
const STUDIO_LIMIT = 6;

/**
 * Aggregate genre + studio frequencies across diary entries by cross-referencing
 * the library store (matching `entry.animeId` → `AnimeEntry.id`) and, when
 * available, an AniList detail cache keyed by `anilistId`.
 *
 * Output arrays match `UserProfile.statistics.{genres,studios}` so the existing
 * Profile `GenreBreakdown` / `StudioBreakdown` components can render them
 * directly. Until a detail cache exists in the app, the hook returns empty
 * arrays — the breakdown components render their built-in "Brak danych…"
 * empty state in that case.
 */
export function useDiaryBreakdowns(
  entries: DiaryEntry[],
  detailCache?: ReadonlyMap<number, DiaryAnimeDetailLike>
): DiaryBreakdowns {
  const libraryEntries = useLibraryStore(s => s.entries);

  return useMemo(() => {
    if (entries.length === 0) return EMPTY_BREAKDOWNS;
    if (!detailCache || detailCache.size === 0) return EMPTY_BREAKDOWNS;

    // Library lookup by local id (matches `DiaryEntry.animeId`).
    const libraryById = new Map<number, AnimeEntry>();
    for (const entry of libraryEntries) {
      libraryById.set(entry.id, entry);
    }

    const genreCounts = new Map<string, number>();
    const studioCounts = new Map<string, number>();

    for (const diary of entries) {
      if (diary.animeId == null) continue;
      const libraryEntry = libraryById.get(diary.animeId);
      if (!libraryEntry?.anilistId) continue;
      const detail = detailCache.get(libraryEntry.anilistId);
      if (!detail) continue;

      if (detail.genres) {
        for (const genre of detail.genres) {
          if (!genre) continue;
          genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
        }
      }

      const edges = detail.studios?.edges;
      if (edges) {
        for (const edge of edges) {
          if (!edge?.isMain) continue;
          const name = edge.node?.name;
          if (!name) continue;
          studioCounts.set(name, (studioCounts.get(name) ?? 0) + 1);
        }
      }
    }

    const genres = Array.from(genreCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, GENRE_LIMIT)
      .map(([name, count]) => ({ name, count, meanScore: 0, minutesWatched: 0 }));

    const studios = Array.from(studioCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, STUDIO_LIMIT)
      .map(([name, count]) => ({ name, count, meanScore: 0, minutesWatched: 0 }));

    return { genres, studios };
  }, [entries, libraryEntries, detailCache]);
}
