import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pencil, Trash2, Film, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { ScoreChip } from '@/components/shared/ScoreChip';
import { CountdownBadge } from '@/components/library/CountdownBadge';
import { SyncBadge } from '@/components/library/SyncBadge';
import { STATUS_LABEL_KEY } from '@/lib/constants';
import { tDynamic } from '@/lib/i18n';
import { useAnimeCard } from './AnimeCard.hooks';
import type { IAnimeCardProps } from './AnimeCard.types';

const AnimeCard = memo(function AnimeCard(props: IAnimeCardProps) {
  const { entry, nextAiring, onSelect, onContinue, onRemove } = props;
  const { t, i18n } = useTranslation(['library', 'status', 'common']);
  const { selectionMode, isSelected, handleActivate, handleKeyDown } = useAnimeCard(props);

  const progressText = entry.episodes
    ? t('common:episodeProgress', { current: entry.currentEpisode, total: entry.episodes })
    : t('common:episodeProgressNoTotal', { current: entry.currentEpisode });

  const progressPercent = entry.episodes
    ? Math.min(100, Math.round((entry.currentEpisode / entry.episodes) * 100))
    : 0;

  const isCompleted = entry.status === 'completed';
  const isWatching = entry.status === 'watching';
  const showProgress = !!entry.episodes && entry.episodes > 0 && (isWatching || isCompleted);
  const hasScore = entry.score != null && entry.score > 0;
  const canContinue = !!onContinue && !!entry.resumeUrl;

  // Status badge (top-left). completed -> green, watching -> accent, dropped/on_hold -> muted.
  const statusLabel = tDynamic(i18n, `status:${STATUS_LABEL_KEY[entry.status]}`);
  const statusVariant: 'accent' | 'green' | 'muted' = isCompleted
    ? 'green'
    : isWatching
      ? 'accent'
      : 'muted';

  const cardAriaLabel = t('library:card.ariaLabel', { title: entry.title, status: statusLabel });

  return (
    <div
      // In selection mode the whole tile is the checkbox (no nested interactive
      // controls, so it can safely carry role/tabIndex). In normal mode the card
      // nests action buttons, so the primary "open" affordance is a stretched
      // <button> overlay (below) instead — a role="button" container wrapping
      // those buttons would be a nested-interactive a11y violation.
      role={selectionMode ? 'checkbox' : undefined}
      aria-checked={selectionMode ? isSelected : undefined}
      aria-label={selectionMode ? cardAriaLabel : undefined}
      tabIndex={selectionMode ? 0 : undefined}
      className={cn(
        'group relative rounded-lg overflow-hidden cursor-pointer',
        'border bg-card/60',
        'transition-transform duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-primary-glow',
        'focus-within:-translate-y-0.5',
        selectionMode &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-translate-y-0.5',
        isSelected ? 'border-primary ring-2 ring-primary/60' : 'border-border-glass'
      )}
      onClick={selectionMode ? handleActivate : undefined}
      onKeyDown={selectionMode ? handleKeyDown : undefined}
    >
      {/* Cover image — 2:3 aspect per mock */}
      <div className="relative aspect-[2/3] overflow-hidden">
        {entry.coverImage ? (
          <FadeInImage
            src={entry.coverImage}
            alt={entry.title}
            className="w-full h-full object-cover"
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

        {/* Primary "open" affordance (normal mode only). A stretched, transparent
            button covering the tile — gives the whole card a single accessible
            name + native keyboard/click without nesting the action buttons inside
            an interactive container (which would trip axe's nested-interactive
            rule). The hover-overlay action buttons sit at a higher z-index, so
            they remain independently clickable above this layer. */}
        {!selectionMode && (
          <button
            type="button"
            onClick={handleActivate}
            aria-label={cardAriaLabel}
            className={cn(
              'absolute inset-0 z-[2]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-lg'
            )}
          />
        )}

        {/* Selection checkbox — top-left, shown only in multi-select mode */}
        {selectionMode && (
          <div className="absolute top-2 left-2 z-[4]">
            <div
              className={cn(
                'w-5 h-5 rounded-sm border flex items-center justify-center shadow-sm transition-colors',
                isSelected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'bg-black/55 border-white/60'
              )}
            >
              {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </div>
          </div>
        )}

        {/* Status pill — top-left */}
        <div
          className={cn(
            'absolute top-2 z-[2] max-w-[calc(100%-52px)] overflow-hidden',
            selectionMode ? 'left-9' : 'left-2'
          )}
        >
          <PillTag
            variant={statusVariant}
            className="shadow-[0_1px_4px_oklch(0_0_0/0.5)] truncate max-w-full"
          >
            {statusLabel}
          </PillTag>
        </div>

        {/* Score — top-right, small mono chip with star */}
        {hasScore && (
          <ScoreChip value={`${entry.score}/10`} scrim className="absolute top-2 right-2 z-[2]" />
        )}

        {/* Next-airing countdown — bottom-left, above title block */}
        {nextAiring && (
          <div className="absolute bottom-14 left-2 z-[2]">
            <CountdownBadge airingAt={nextAiring.airingAt} episode={nextAiring.episode} />
          </div>
        )}

        {/* Per-provider sync indicators — top-right, below the score chip,
            stacked. Each badge self-gates: renders nothing (no chip) when its
            provider is disconnected or the entry lacks that provider's id, so an
            empty column stays invisible. */}
        <div
          className={cn(
            'absolute right-2 z-[2] flex flex-col items-end gap-1',
            entry.score != null && entry.score > 0 ? 'top-9' : 'top-2'
          )}
        >
          <SyncBadge
            entry={entry}
            provider="anilist"
            iconClassName="w-3 h-3"
            className="h-5 w-5 rounded-[4px] bg-black/65 shadow-[0_1px_4px_oklch(0_0_0/0.5)]"
          />
          <SyncBadge
            entry={entry}
            provider="mal"
            iconClassName="w-3 h-3"
            className="h-5 w-5 rounded-[4px] bg-black/65 shadow-[0_1px_4px_oklch(0_0_0/0.5)]"
          />
        </div>

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
          <p className="mt-[3px] font-mono text-[10px] uppercase tracking-[0.08em] tabular-nums text-white/80">
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
                  ? 'bg-status-success shadow-[0_0_6px_oklch(from_var(--status-success)_l_c_h/0.6)]'
                  : 'bg-primary shadow-[0_0_6px_oklch(from_var(--primary)_l_c_h/0.55)]'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover overlay with action buttons — suppressed in selection mode */}
        {!selectionMode && (
          <div
            className={cn(
              'absolute inset-0 z-[3]',
              'bg-gradient-to-t from-background/60 via-background/25 to-background/5',
              'flex items-center justify-center gap-2.5',
              'transition-opacity duration-200',
              'opacity-0 pointer-events-none',
              'group-hover:opacity-100 group-hover:pointer-events-auto',
              'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
            )}
          >
            {canContinue && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onContinue?.(entry);
                }}
                aria-label={t('library:card.continue')}
                className={cn(
                  'w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md',
                  'flex items-center justify-center',
                  'hover:bg-primary/90 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'transition-colors duration-150'
                )}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default AnimeCard;
