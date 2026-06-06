import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { RecommendationsSection } from './RecommendationsSection';
import { StreamingEpisodesSection } from './StreamingEpisodesSection';

const { ensureDetails } = useAnimeDetailStore.getState();

interface AnimeDetailExtrasProps {
  /** AniList media id of the open library entry. */
  anilistId: number;
}

/**
 * Detail-driven enrichments rendered below the relations in the library modal:
 * the "Więcej takich" recommendations row, per-episode streaming links and the
 * MyAnimeList deep-link. All three live on the fetched {@link AnimeDetail}
 * (not the library {@link AnimeEntry}), so this self-fetches like RelationsSection
 * and shares the same per-id cache.
 */
export function AnimeDetailExtras({ anilistId }: AnimeDetailExtrasProps) {
  const { t } = useTranslation('library');

  const detail = useAnimeDetailStore(s => s.details.get(anilistId));

  useEffect(() => {
    ensureDetails([anilistId]);
  }, [anilistId]);

  const recommendations = useMemo(() => detail?.recommendations?.nodes ?? [], [detail]);
  const streamingEpisodes = useMemo(() => detail?.streamingEpisodes ?? [], [detail]);
  const idMal = detail?.idMal;

  return (
    <>
      <RecommendationsSection recommendations={recommendations} />
      <StreamingEpisodesSection episodes={streamingEpisodes} />
      {idMal ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() =>
            window.open(`https://myanimelist.net/anime/${idMal}`, '_blank', 'noopener,noreferrer')
          }
        >
          {t('detail.openOnMal')}
          <ExternalLink className="w-3 h-3" />
        </Button>
      ) : null}
    </>
  );
}
