import { useTranslation } from 'react-i18next';
import { ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeInImage } from '@/components/shared/FadeInImage';
import type { IStreamingEpisodesListProps, IStreamingLinksListProps } from './AnimeInfoLinks.types';

/** Platform streaming links (Crunchyroll, etc.) — open in the in-app browser. */
export function StreamingLinksList({ streamingLinks, onNavigate }: IStreamingLinksListProps) {
  return (
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
  );
}

/** Per-episode legal streaming links — open in the system browser. */
export function StreamingEpisodesList({ episodes }: IStreamingEpisodesListProps) {
  const { t } = useTranslation('schedule');

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-proximity [mask-image:linear-gradient(to_right,#000_calc(100%_-_32px),transparent_100%)]">
      {/* streamingEpisodes is an unbounded AniList list field — cap the row */}
      {episodes.slice(0, 50).map(ep => (
        <button
          key={ep.url}
          type="button"
          onClick={() => window.open(ep.url, '_blank', 'noopener,noreferrer')}
          aria-label={t('dialog.streamingEpisodeAria', { title: ep.title, site: ep.site })}
          className="group/ep relative shrink-0 w-40 snap-start text-left rounded-lg overflow-hidden border border-border/50 bg-muted/30 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative aspect-video overflow-hidden bg-muted">
            {ep.thumbnail && (
              <FadeInImage
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
  );
}
