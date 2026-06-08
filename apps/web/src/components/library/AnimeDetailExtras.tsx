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
  /** Open a URL in the in-app browser (new tab) and close the modal. */
  onNavigate: (url: string) => void;
}

/**
 * Detail-driven enrichments rendered below the relations in the library modal:
 * the "Więcej takich" recommendations row, per-episode streaming links and the
 * AniList + MyAnimeList reference links. All live on the fetched
 * {@link AnimeDetail} (not the library {@link AnimeEntry}), so this self-fetches
 * like RelationsSection and shares the same per-id cache.
 *
 * The reference links open in the in-app browser (a new tab) via {@link onNavigate}
 * — both are plain info pages, so they render correctly in the embedded webview;
 * mirrors the schedule view's AnimeInfoLinks.
 */
export function AnimeDetailExtras({ anilistId, onNavigate }: AnimeDetailExtrasProps) {
  const { t } = useTranslation('library');

  const detail = useAnimeDetailStore(s => s.details.get(anilistId));

  useEffect(() => {
    ensureDetails([anilistId]);
  }, [anilistId]);

  const recommendations = useMemo(() => detail?.recommendations?.nodes ?? [], [detail]);
  const streamingEpisodes = useMemo(() => detail?.streamingEpisodes ?? [], [detail]);
  const siteUrl = detail?.siteUrl;
  const idMal = detail?.idMal;

  return (
    <>
      <RecommendationsSection recommendations={recommendations} />
      <StreamingEpisodesSection episodes={streamingEpisodes} />
      {siteUrl || idMal ? (
        <div className="flex flex-wrap gap-2">
          {siteUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => onNavigate(siteUrl)}
            >
              {t('detail.openOnAniList')}
              <ExternalLink className="w-3 h-3" />
            </Button>
          ) : null}
          {idMal ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => onNavigate(`https://myanimelist.net/anime/${idMal}`)}
            >
              {t('detail.openOnMal')}
              <ExternalLink className="w-3 h-3" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
