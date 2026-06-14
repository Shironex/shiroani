import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreamingEpisodesList, StreamingLinksList } from './AnimeInfoLinks.parts';
import type { IAnimeInfoLinksProps } from './AnimeInfoLinks.types';

export default function AnimeInfoLinks({
  details,
  streamingLinks,
  onNavigate,
}: IAnimeInfoLinksProps) {
  const { t } = useTranslation('schedule');
  const streamingEpisodes = details?.streamingEpisodes ?? [];

  const hasTrailer = Boolean(details?.trailer?.id && details.trailer.site === 'youtube');
  const hasReferenceLinks = Boolean(details?.siteUrl || details?.idMal);

  return (
    <>
      {/* Trailer */}
      {hasTrailer && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.trailer')}</h3>
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50">
            <iframe
              src={`https://www.youtube.com/embed/${details!.trailer!.id}`}
              title={t('dialog.trailerTitle')}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Streaming links */}
      {streamingLinks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            {t('dialog.streaming')}
          </h3>
          <StreamingLinksList streamingLinks={streamingLinks} onNavigate={onNavigate} />
        </div>
      )}

      {/* Per-episode legal streaming links (distinct from the platform links above).
          Open in the system browser as instructed for streaming episodes. */}
      {streamingEpisodes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            {t('dialog.streamingEpisodes')}
          </h3>
          <StreamingEpisodesList episodes={streamingEpisodes} />
        </div>
      )}

      {/* External reference links — AniList + MyAnimeList, both open in the in-app browser */}
      {hasReferenceLinks && (
        <div className="flex flex-col gap-1.5 pt-1">
          {details?.siteUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 w-full"
              onClick={() => onNavigate(details.siteUrl!)}
            >
              {t('dialog.openOnAniList')}
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
          {details?.idMal && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 w-full"
              onClick={() => onNavigate(`https://myanimelist.net/anime/${details.idMal}`)}
            >
              {t('dialog.openOnMal')}
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </>
  );
}
