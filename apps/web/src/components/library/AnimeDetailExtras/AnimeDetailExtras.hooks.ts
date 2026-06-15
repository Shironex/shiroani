import { useEffect, useMemo } from 'react';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import type { IAnimeDetailExtrasProps, IAnimeDetailExtrasView } from './AnimeDetailExtras.types';

const { ensureDetails } = useAnimeDetailStore.getState();

export function useAnimeDetailExtras({
  anilistId,
}: IAnimeDetailExtrasProps): IAnimeDetailExtrasView {
  const detail = useAnimeDetailStore(s => s.details.get(anilistId));

  useEffect(() => {
    ensureDetails([anilistId]);
  }, [anilistId]);

  const recommendations = useMemo(() => detail?.recommendations?.nodes ?? [], [detail]);
  const streamingEpisodes = useMemo(() => detail?.streamingEpisodes ?? [], [detail]);

  return {
    recommendations,
    streamingEpisodes,
    siteUrl: detail?.siteUrl,
    idMal: detail?.idMal,
  };
}
