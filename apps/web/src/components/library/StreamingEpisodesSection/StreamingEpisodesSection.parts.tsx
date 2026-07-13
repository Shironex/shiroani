import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FadeInImage } from '@/components/shared/FadeInImage';
import type { AnimeDetailStreamingEpisode } from '@shiroani/shared';

export const StreamingEpisodeCard = memo(function StreamingEpisodeCard({
  episode,
}: {
  episode: AnimeDetailStreamingEpisode;
}) {
  const { t } = useTranslation('library');

  const handleClick = useCallback(() => {
    window.open(episode.url, '_blank', 'noopener,noreferrer');
  }, [episode.url]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('streamingEpisodes.watchAria', { title: episode.title, site: episode.site })}
      className={cn(
        'group/ep relative shrink-0 w-40 text-left snap-start',
        'rounded-md overflow-hidden border border-border-glass bg-background/40',
        'transition-colors hover:border-primary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-muted/50">
        {episode.thumbnail && (
          <FadeInImage
            src={episode.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"
        />
        <div className="absolute bottom-1 left-1 z-[2] flex items-center justify-center w-6 h-6 rounded-full bg-primary/90 shadow-[0_1px_4px_oklch(0_0_0/0.5)]">
          <Play className="w-3 h-3 text-primary-foreground fill-current" />
        </div>
      </div>
      <div className="px-1.5 py-1">
        <p className="text-[11px] font-semibold leading-[1.2] line-clamp-2 text-foreground/90">
          {episode.title}
        </p>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          {episode.site}
          <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </button>
  );
});
