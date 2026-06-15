import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAddDiscoverMediaToLibrary } from '@/components/discover/useAddDiscoverMediaToLibrary';
import type { AnimeEntry } from '@shiroani/shared';
import type {
  IRecommendationsSectionProps,
  IRecommendationsSectionView,
} from './RecommendationsSection.types';

export function useRecommendationsSection({
  recommendations,
}: IRecommendationsSectionProps): IRecommendationsSectionView {
  const addToLibrary = useAddDiscoverMediaToLibrary();
  const entries = useLibraryStore(s => s.entries);

  const entryByAnilistId = useMemo(() => {
    const map = new Map<number, AnimeEntry>();
    for (const e of entries) {
      if (e.anilistId) map.set(e.anilistId, e);
    }
    return map;
  }, [entries]);

  const nodes = useMemo(
    () => recommendations.map(r => r.mediaRecommendation).filter(Boolean),
    [recommendations]
  );

  return { nodes, entryByAnilistId, addToLibrary };
}
