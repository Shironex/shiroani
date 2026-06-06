import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnimeDetailStreamingEpisode } from '@shiroani/shared';

interface StreamingEpisodesSectionProps {
  /** Per-episode legal-stream entries from the cached {@link AnimeDetail}. */
  episodes: AnimeDetailStreamingEpisode[];
}

/**
 * AniList's `streamingEpisodes` is an unbounded list field (no `perPage`), so a
 * long-running series can return hundreds of entries. Cap the rendered thumbnails
 * to keep this image-heavy row light; the full list lives on the streaming site.
 */
const MAX_STREAMING_EPISODES = 50;

/**
 * Per-episode legal streaming links (title + thumbnail + provider site). Distinct
 * from the platform-level external STREAMING links — these point at a specific
 * episode on a licensed streaming site and open in the system browser.
 *
 * PERF: image-heavy scrollable row — repeated cards avoid hover-scale / translate.
 */
export function StreamingEpisodesSection({ episodes }: StreamingEpisodesSectionProps) {
  const { t } = useTranslation('library');

  if (episodes.length === 0) return null;

  return (
    <div className="space-y-2">
      <FieldLabel>{t('streamingEpisodes.title')}</FieldLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {episodes.slice(0, MAX_STREAMING_EPISODES).map(ep => (
          <StreamingEpisodeCard key={ep.url} episode={ep} />
        ))}
      </div>
    </div>
  );
}

const StreamingEpisodeCard = memo(function StreamingEpisodeCard({
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
        'group/ep relative shrink-0 w-40 text-left',
        'rounded-md overflow-hidden border border-border-glass bg-background/40',
        'transition-colors hover:border-primary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-muted/50">
        {episode.thumbnail && (
          <img
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
      {children}
    </span>
  );
}
