import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { CountdownBadge } from '@/components/library/CountdownBadge';
import { formatEpisodeProgress } from '@/lib/anime-utils';
import { STATUS_LABEL_KEY } from '@/lib/constants';
import type { AnimeEntry } from '@shiroani/shared';

interface LibraryListItemProps {
  entry: AnimeEntry;
  nextAiring?: { episode: number; airingAt: number } | null;
  onClick: () => void;
}

const STATUS_PILL_VARIANT: Record<
  AnimeEntry['status'],
  'accent' | 'green' | 'gold' | 'blue' | 'muted'
> = {
  watching: 'accent',
  completed: 'green',
  plan_to_watch: 'blue',
  on_hold: 'gold',
  dropped: 'muted',
};

const LibraryListItem = memo(function LibraryListItem({
  entry,
  nextAiring,
  onClick,
}: LibraryListItemProps) {
  const { t } = useTranslation('status');
  const progressPercent = entry.episodes
    ? Math.min(100, Math.round((entry.currentEpisode / entry.episodes) * 100))
    : 0;

  const statusLabel = t(STATUS_LABEL_KEY[entry.status]);
  const hasScore = entry.score != null && entry.score > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'grid items-center gap-3 px-3.5 py-2.5 rounded-[8px] cursor-pointer',
        'grid-cols-[44px_minmax(0,1fr)_auto_minmax(140px,1fr)_auto]',
        'hover:bg-foreground/4 transition-colors duration-150',
        'border border-transparent hover:border-border-glass',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-foreground/5',
        'group/list-item'
      )}
    >
      {/* Thumbnail */}
      {entry.coverImage ? (
        <img
          src={entry.coverImage}
          alt={entry.title}
          className="w-11 h-14 rounded-md object-cover shrink-0 border border-border-glass"
          loading="lazy"
        />
      ) : (
        <div className="w-11 h-14 rounded-md bg-muted/50 shrink-0 border border-border-glass" />
      )}

      {/* Title + meta */}
      <div className="min-w-0">
        <h3 className="text-[13px] font-bold truncate group-hover/list-item:text-primary transition-colors leading-[1.2]">
          {entry.title}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono tracking-[0.04em]">
          {formatEpisodeProgress(entry.currentEpisode, entry.episodes)}
        </p>
      </div>

      {/* Status pill */}
      <div className="shrink-0 flex items-center gap-2">
        <PillTag variant={STATUS_PILL_VARIANT[entry.status]}>{statusLabel}</PillTag>
        {nextAiring && (
          <CountdownBadge airingAt={nextAiring.airingAt} episode={nextAiring.episode} />
        )}
      </div>

      {/* Progress bar + text */}
      <div className="flex items-center gap-3 min-w-0">
        <ProgressBar
          value={progressPercent}
          thickness={4}
          className="flex-1 min-w-0"
          aria-label={`Postęp: ${progressPercent}%`}
        />
        <span className="text-[10.5px] font-mono text-muted-foreground whitespace-nowrap tabular-nums shrink-0">
          {entry.episodes ? `${entry.currentEpisode}/${entry.episodes}` : entry.currentEpisode}
        </span>
      </div>

      {/* Score */}
      <div className="shrink-0 w-14 flex items-center justify-end gap-1">
        {hasScore ? (
          <>
            <Star className="w-3 h-3 fill-current text-[oklch(0.8_0.14_70)]" strokeWidth={0} />
            <span className="text-[11.5px] font-mono font-bold tabular-nums text-[oklch(0.8_0.14_70)]">
              {entry.score}
            </span>
          </>
        ) : (
          <span className="text-[11.5px] font-mono text-muted-foreground/40">-</span>
        )}
      </div>
    </div>
  );
});

export { LibraryListItem };
