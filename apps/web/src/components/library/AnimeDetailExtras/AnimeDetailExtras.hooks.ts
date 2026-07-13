import { useEffect, useMemo } from 'react';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import type { IAnimeDetailExtrasProps, IAnimeDetailExtrasView } from './AnimeDetailExtras.types';

const { ensureDetails } = useAnimeDetailStore.getState();

export function useAnimeDetailExtras({
  anilistId,
}: IAnimeDetailExtrasProps): IAnimeDetailExtrasView {
  const detail = useAnimeDetailStore(s => s.details.get(anilistId));
  // Mirror RelationsSection: expose the in-flight state so the modal can render
  // row skeletons instead of letting the enrichment sections pop in later.
  const isLoading = useAnimeDetailStore(s => s.inFlight.has(anilistId));

  useEffect(() => {
    ensureDetails([anilistId]);
  }, [anilistId]);

  const recommendations = useMemo(() => detail?.recommendations?.nodes ?? [], [detail]);
  const streamingEpisodes = useMemo(() => detail?.streamingEpisodes ?? [], [detail]);

  return {
    isLoading: isLoading && !detail,
    recommendations,
    streamingEpisodes,
    siteUrl: detail?.siteUrl,
    idMal: detail?.idMal,
  };
}
