import { useTranslation } from 'react-i18next';
import { ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnimeDetail, AnimeDetailExternalLink } from '@shiroani/shared';

interface AnimeInfoLinksProps {
  details: AnimeDetail | null;
  streamingLinks: AnimeDetailExternalLink[];
  onNavigate: (url: string) => void;
}

export function AnimeInfoLinks({ details, streamingLinks, onNavigate }: AnimeInfoLinksProps) {
  const { t } = useTranslation('schedule');
  const streamingEpisodes = details?.streamingEpisodes ?? [];

  return (
    <>
      {/* Trailer */}
      {details?.trailer?.id && details.trailer.site === 'youtube' && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('dialog.trailer')}</h3>
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50">
            <iframe
              src={`https://www.youtube.com/embed/${details.trailer.id}`}
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
          <div className="flex flex-wrap gap-1.5">
            {streamingLinks.map(link => (
              <Button
                key={link.url}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => onNavigate(link.url)}
              >
                {link.icon && <img src={link.icon} alt="" className="w-3.5 h-3.5" />}
                {link.site}
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Per-episode legal streaming links (distinct from the platform links above).
          Open in the system browser as instructed for streaming episodes. */}
      {streamingEpisodes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            {t('dialog.streamingEpisodes')}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* streamingEpisodes is an unbounded AniList list field — cap the row */}
            {streamingEpisodes.slice(0, 50).map(ep => (
              <button
                key={ep.url}
                type="button"
                onClick={() => window.open(ep.url, '_blank', 'noopener,noreferrer')}
                aria-label={t('dialog.streamingEpisodeAria', { title: ep.title, site: ep.site })}
                className="group/ep relative shrink-0 w-40 text-left rounded-lg overflow-hidden border border-border/50 bg-muted/30 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-video overflow-hidden bg-muted">
                  {ep.thumbnail && (
                    <img
                      src={ep.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
                  />
                  <div className="absolute bottom-1 left-1 flex items-center justify-center w-6 h-6 rounded-full bg-primary/90">
                    <Play className="w-3 h-3 text-primary-foreground fill-current" />
                  </div>
                </div>
                <div className="px-1.5 py-1">
                  <p className="text-2xs font-medium leading-tight line-clamp-2">{ep.title}</p>
                  <span className="mt-0.5 flex items-center gap-1 text-2xs text-muted-foreground">
                    {ep.site}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* External reference links — AniList + MyAnimeList, both open in the in-app browser */}
      {(details?.siteUrl || details?.idMal) && (
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
