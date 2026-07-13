import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { CountdownBadge } from '@/components/library/CountdownBadge';
import { SyncBadge } from '@/components/library/SyncBadge';
import { formatEpisodeProgress } from '@/lib/anime-utils';
import { STATUS_LABEL_KEY } from '@/lib/constants';
import { tDynamic } from '@/lib/i18n';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryListItem } from './LibraryListItem.hooks';
import type { ILibraryListItemProps } from './LibraryListItem.types';

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

const LibraryListItem = memo(function LibraryListItem(props: ILibraryListItemProps) {
  const { entry, nextAiring } = props;
  const { t, i18n } = useTranslation(['library', 'status', 'common']);
  const { t: tc } = useTranslation('common');
  const { selectionMode, isSelected, handleActivate } = useLibraryListItem(props);

  const progressPercent = entry.episodes
    ? Math.min(100, Math.round((entry.currentEpisode / entry.episodes) * 100))
    : 0;

  const statusLabel = tDynamic(i18n, `status:${STATUS_LABEL_KEY[entry.status]}`);
  const hasScore = entry.score != null && entry.score > 0;

  return (
    <div
      role={selectionMode ? 'checkbox' : 'button'}
      aria-checked={selectionMode ? isSelected : undefined}
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={cn(
        'grid items-center gap-3 px-3.5 py-2.5 rounded-md cursor-pointer',
        selectionMode
          ? 'grid-cols-[20px_44px_minmax(0,1fr)_auto_minmax(140px,1fr)_auto]'
          : 'grid-cols-[44px_minmax(0,1fr)_auto_minmax(140px,1fr)_auto]',
        'hover:bg-foreground/4 transition-colors duration-150',
        'border hover:border-border-glass',
        isSelected ? 'border-primary/60 bg-primary/5' : 'border-transparent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-foreground/5',
        'group/list-item'
      )}
    >
      {/* Selection checkbox (multi-select mode only) */}
      {selectionMode && (
        <div
          className={cn(
            'w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
            isSelected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-background/40 border-border-glass'
          )}
        >
          {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </div>
      )}

      {/* Thumbnail */}
      {entry.coverImage ? (
        <FadeInImage
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
          {formatEpisodeProgress(tc, entry.currentEpisode, entry.episodes)}
        </p>
      </div>

      {/* Status pill */}
      <div className="shrink-0 flex items-center gap-2">
        <PillTag variant={STATUS_PILL_VARIANT[entry.status]}>{statusLabel}</PillTag>
        {/* Per-provider sync indicators — each renders nothing when its provider
            is disconnected or the entry lacks that provider's id. */}
        <SyncBadge entry={entry} provider="anilist" />
        <SyncBadge entry={entry} provider="mal" />
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
          aria-label={t('library:list.progressAriaLabel', { percent: progressPercent })}
        />
        <span className="text-[10.5px] font-mono text-muted-foreground whitespace-nowrap tabular-nums shrink-0">
          {entry.episodes ? `${entry.currentEpisode}/${entry.episodes}` : entry.currentEpisode}
        </span>
      </div>

      {/* Score */}
      <div className="shrink-0 w-14 flex items-center justify-end gap-1">
        {hasScore ? (
          <>
            <Star className="w-3 h-3 fill-current text-gold" strokeWidth={0} />
            <span className="text-[11.5px] font-mono font-bold tabular-nums text-gold">
              {entry.score}
            </span>
          </>
        ) : (
          <span className="text-[11.5px] font-mono text-muted-foreground">–</span>
        )}
      </div>
    </div>
  );
});

export default LibraryListItem;
