import { useEffect, useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import type { IQuickStatsCardView } from './QuickStatsCard.types';

export function useQuickStatsCard(): IQuickStatsCardView {
  const entries = useLibraryStore(s => s.entries);
  const streakDays = useAppStatsStore(s => s.snapshot.currentStreak.days);

  const { libraryCount, episodesWatched } = useMemo(() => {
    let episodes = 0;
    for (const entry of entries) {
      episodes += entry.currentEpisode ?? 0;
    }
    return { libraryCount: entries.length, episodesWatched: episodes };
  }, [entries]);

  // One-shot pull so the streak isn't stuck at 0 on a fresh newtab load.
  useEffect(() => {
    void useAppStatsStore.getState().refresh();
  }, []);

  return { libraryCount, episodesWatched, streakDays };
}
