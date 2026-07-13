import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eyebrow } from '@/components/shared/Eyebrow';
import { RecommendationsSection } from '@/components/library/RecommendationsSection';
import { StreamingEpisodesSection } from '@/components/library/StreamingEpisodesSection';
import { useAnimeDetailExtras } from './AnimeDetailExtras.hooks';
import type { IAnimeDetailExtrasProps } from './AnimeDetailExtras.types';

/** Horizontal row of poster/thumbnail skeletons shown while the detail loads. */
function ExtrasRowSkeleton({ label, cardClassName }: { label: string; cardClassName: string }) {
  const cards = Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className={cardClassName} />);

  return (
    <div className="space-y-2">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex gap-2 overflow-hidden">{cards}</div>
    </div>
  );
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
export default function AnimeDetailExtras({ anilistId, onNavigate }: IAnimeDetailExtrasProps) {
  const { t } = useTranslation('library');
  const { isLoading, recommendations, streamingEpisodes, siteUrl, idMal } = useAnimeDetailExtras({
    anilistId,
    onNavigate,
  });

  // While the detail is still loading, reserve the two enrichment rows with
  // horizontal skeletons so they don't pop in and shove the modal content.
  if (isLoading) {
    return (
      <>
        <ExtrasRowSkeleton
          label={t('recommendations.title')}
          cardClassName="h-36 w-24 shrink-0 rounded-md"
        />
        <ExtrasRowSkeleton
          label={t('streamingEpisodes.title')}
          cardClassName="h-[90px] w-40 shrink-0 rounded-md"
        />
      </>
    );
  }

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
