import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { AnimeStatus } from '@shiroani/shared';
import type { ILibraryStatsView } from './LibraryStats.types';

export function useLibraryStats(): ILibraryStatsView {
  const entries = useLibraryStore(s => s.entries);

  const stats = useMemo(() => {
    const totalEntries = entries.length;

    const totalEpisodes = entries.reduce((sum, e) => sum + e.currentEpisode, 0);

    const breakdown: Record<AnimeStatus, number> = {
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      on_hold: 0,
      dropped: 0,
    };
    for (const entry of entries) {
      breakdown[entry.status]++;
    }

    const scored = entries.filter(e => e.score != null && e.score > 0);
    const avgScore =
      scored.length > 0 ? scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length : 0;

    return { totalEntries, totalEpisodes, breakdown, avgScore, scoredCount: scored.length };
  }, [entries]);

  return { stats, hasEntries: stats.totalEntries > 0 };
}
