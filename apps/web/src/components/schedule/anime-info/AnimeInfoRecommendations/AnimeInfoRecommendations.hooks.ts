import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAddDiscoverMediaToLibrary } from '@/components/discover/useAddDiscoverMediaToLibrary';
import type { AnimeDetail, AnimeDetailRecommendation } from '@shiroani/shared';
import type { IAnimeInfoRecommendationsView } from './AnimeInfoRecommendations.types';

export function useAnimeInfoRecommendations(
  details: AnimeDetail | null
): IAnimeInfoRecommendationsView {
  const addToLibrary = useAddDiscoverMediaToLibrary();
  const entries = useLibraryStore(s => s.entries);

  const inLibraryIds = useMemo(() => {
    const set = new Set<number>();
    for (const e of entries) {
      if (e.anilistId) set.add(e.anilistId);
    }
    return set;
  }, [entries]);

  const nodes = useMemo<AnimeDetailRecommendation['mediaRecommendation'][]>(
    () => (details?.recommendations?.nodes ?? []).map(r => r.mediaRecommendation).filter(Boolean),
    [details]
  );

  return { nodes, inLibraryIds, addToLibrary };
}
