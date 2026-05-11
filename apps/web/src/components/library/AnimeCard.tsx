import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pencil, Trash2, Film, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { CountdownBadge } from '@/components/library/CountdownBadge';
import type { AnimeEntry } from '@shiroani/shared';
import { STATUS_LABEL_KEY } from '@/lib/constants';
import { tDynamic } from '@/lib/i18n';

interface AnimeCardProps {
  entry: AnimeEntry;
  nextAiring?: { airingAt: number; episode: number } | null;
  onSelect: (entry: AnimeEntry) => void;
  onContinue?: (entry: AnimeEntry) => void;
  onRemove?: (entry: AnimeEntry) => void;
}

const AnimeCard = memo(function AnimeCard({
  entry,
  nextAiring,
  onSelect,
  onContinue,
  onRemove,
}: AnimeCardProps) {
  const { t, i18n } = useTranslation(['library', 'status', 'common']);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(entry);
      }
    },
    [onSelect, entry]
  );

  const progressText = entry.episodes
    ? t('common:episodeProgress', { current: entry.currentEpisode, total: entry.episodes })
    : t('common:episodeProgressNoTotal', { current: entry.currentEpisode });

  const progressPercent = entry.episodes
    ? Math.min(100, Math.round((entry.currentEpisode / entry.episodes) * 100))
    : 0;

  const isCompleted = entry.status === 'completed';
  const isWatching = entry.status === 'watching';
  const showProgress = !!entry.episodes && entry.episodes > 0 && (isWatching || isCompleted);

  // Status badge (top-left). completed -> green, watching -> accent, dropped/on_hold -> muted.
  const statusLabel = tDynamic(i18n, `status:${STATUS_LABEL_KEY[entry.status]}`);
  const statusVariant: 'accent' | 'green' | 'muted' = isCompleted
    ? 'green'
    : isWatching
      ? 'accent'
      : 'muted';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('library:card.ariaLabel', { title: entry.title, status: statusLabel })}
      className={cn(
        'group relative rounded-[10px] overflow-hidden cursor-pointer',
        'border border-border-glass bg-card/60',
        'transition-transform duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-primary-glow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-translate-y-0.5'
      )}
      onClick={() => onSelect(entry)}
      onKeyDown={handleKeyDown}
    >
      {/* Cover image — 2:3 aspect per mock */}
      <div className="relative aspect-[2/3] overflow-hidden">
        {entry.coverImage ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-background/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <span className="text-muted-foreground/50 text-2xs font-medium">
              {t('library:card.noCover')}
            </span>
          </div>
        )}

        {/* Top gradient sheen + bottom darkening — matches mock .cov::after */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.12), transparent 45%), linear-gradient(180deg, transparent 45%, oklch(0 0 0 / 0.68))',
          }}
        />

        {/* Status pill — top-left */}
        <div className="absolute top-2 left-2 z-[2] max-w-[calc(100%-52px)] overflow-hidden">
          <PillTag
            variant={statusVariant}
            className="shadow-[0_1px_4px_oklch(0_0_0/0.5)] truncate max-w-full"
          >
            {statusLabel}
          </PillTag>
        </div>

        {/* Score — top-right, small mono chip with star */}
        {entry.score != null && entry.score > 0 && (
          <div
            className={cn(
              'absolute top-2 right-2 z-[2]',
              'flex items-center gap-[3px] px-[6px] py-[3px] rounded-[3px]',
              'bg-black/70 text-[10px] font-mono font-bold leading-none',
              'text-[oklch(0.8_0.14_70)]'
            )}
          >
            <Star className="w-3 h-3 fill-current" strokeWidth={0} />
            <span className="tabular-nums">{entry.score}/10</span>
          </div>
        )}

        {/* Next-airing countdown — bottom-left, above title block */}
        {nextAiring && (
          <div className="absolute bottom-14 left-2 z-[2]">
            <CountdownBadge airingAt={nextAiring.airingAt} episode={nextAiring.episode} />
          </div>
        )}

        {/* Bottom title block — sits above the progress line */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 z-[1] px-[10px] pt-7 pb-[10px]',
            showProgress ? 'pb-3' : 'pb-[10px]'
          )}
        >
          <h3 className="text-[12px] font-bold leading-[1.2] text-white line-clamp-2 drop-shadow-[0_1px_3px_oklch(0_0_0/0.6)]">
            {entry.title}
          </h3>
          <p className="mt-[3px] font-mono text-[10px] uppercase tracking-[0.08em] text-white/80">
            {progressText}
          </p>
        </div>

        {/* Thin progress bar, flush bottom */}
        {showProgress && (
          <div className="absolute left-0 right-0 bottom-0 z-[2] h-[3px] bg-white/12">
            <div
              className={cn(
                'h-full transition-[width] duration-300',
                isCompleted
                  ? 'bg-[oklch(0.78_0.15_140)] shadow-[0_0_6px_oklch(0.78_0.15_140/0.6)]'
                  : 'bg-primary shadow-[0_0_6px_oklch(from_var(--primary)_l_c_h/0.55)]'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover overlay with action buttons */}
        <div
          className={cn(
            'absolute inset-0 z-[3]',
            'bg-gradient-to-t from-background/60 via-background/25 to-background/5',
            'flex items-center justify-center gap-2.5',
            'transition-opacity duration-250',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
          )}
        >
          {onContinue && entry.resumeUrl && (
            <button
              onClick={e => {
                e.stopPropagation();
                onContinue(entry);
              }}
              aria-label={t('library:card.continue')}
              className={cn(
                'w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md',
                'flex items-center justify-center',
                'hover:bg-primary/90 active:scale-95',
                'transition-colors duration-150'
              )}
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={e => {
              e.stopPropagation();
              onSelect(entry);
            }}
            aria-label={t('library:card.edit')}
            className={cn(
              'w-8 h-8 rounded-full bg-accent text-accent-foreground shadow-md',
              'flex items-center justify-center',
              'hover:bg-accent/90 active:scale-95',
              'transition-colors duration-150'
            )}
          >
            <Pencil className="w-3 h-3" />
          </button>
          {onRemove && (
            <button
              onClick={e => {
                e.stopPropagation();
                onRemove(entry);
              }}
              aria-label={t('library:card.remove')}
              className={cn(
                'w-8 h-8 rounded-full bg-destructive text-destructive-foreground shadow-md',
                'flex items-center justify-center',
                'hover:bg-destructive/90 active:scale-95',
                'transition-colors duration-150'
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export { AnimeCard };
