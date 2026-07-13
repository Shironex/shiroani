import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Film, ListChecks, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { ScoreChip } from '@/components/shared/ScoreChip';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { formatRawScore } from '@/lib/anime-utils';
import { useDiscoverCard } from './DiscoverCard.hooks';
import type { IDiscoverCardProps } from './DiscoverCard.types';

function DiscoverCard({ media, inLibrary, onClick, onAddToLibrary }: IDiscoverCardProps) {
  const { t } = useTranslation('discover');
  const {
    title,
    coverUrl,
    showImage,
    formatLabel,
    subtitle,
    hasScore,
    handleClick,
    handleImageError,
    handleAddClick,
  } = useDiscoverCard({ media, inLibrary, onClick, onAddToLibrary });

  return (
    <div
      className={cn(
        'group relative rounded-lg overflow-hidden cursor-pointer',
        'border border-border-glass bg-card/60',
        'transition-transform duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-primary-glow',
        'focus-within:-translate-y-0.5'
      )}
    >
      {/* Cover — 2:3 aspect, matching Library card vocabulary */}
      <div className="relative aspect-[2/3] overflow-hidden">
        {showImage ? (
          <FadeInImage
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.03]"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-background/30 flex items-center justify-center">
              <Film className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <span className="text-muted-foreground/50 text-2xs font-medium">
              {t('card.noCover')}
            </span>
          </div>
        )}

        {/* Top sheen + bottom darkening — matches Library .cov::after */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.12), transparent 45%), linear-gradient(180deg, transparent 45%, oklch(0 0 0 / 0.68))',
          }}
        />

        {/* Primary "open detail" affordance — a stretched, transparent button
            covering the tile. Gives the card a single accessible name and native
            keyboard/click without nesting the add-to-library button inside an
            interactive container (which would trip axe's nested-interactive
            rule). The hover-overlay add button sits at a higher z-index so it
            stays independently clickable above this layer. */}
        <button
          type="button"
          onClick={handleClick}
          aria-label={title}
          className={cn(
            'absolute inset-0 z-[2]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-lg'
          )}
        />

        {/* Format pill — top-left */}
        {formatLabel && (
          <div className="pointer-events-none absolute top-2 left-2 z-[2]">
            <PillTag variant="muted" className="shadow-[0_1px_4px_oklch(0_0_0/0.5)]">
              {formatLabel}
            </PillTag>
          </div>
        )}

        {/* AniList "on your list" badge (item C4) — only when the backend
            explicitly resolved membership for a connected viewer. Sits below the
            format pill so it never overlaps it. */}
        {media.onList === true && (
          <div
            className={cn(
              'pointer-events-none absolute left-2 z-[2]',
              formatLabel ? 'top-9' : 'top-2'
            )}
          >
            <span
              title={t('card.onListTooltip')}
              className={cn(
                'inline-flex items-center gap-1 px-[6px] py-[3px] rounded-[3px]',
                'bg-primary/85 text-primary-foreground text-[9.5px] font-mono font-bold uppercase',
                'tracking-[0.08em] leading-none shadow-[0_1px_4px_oklch(0_0_0/0.5)]'
              )}
            >
              <ListChecks className="w-3 h-3" strokeWidth={2.5} />
              {t('card.onList')}
            </span>
          </div>
        )}

        {/* Score chip — top-right */}
        {hasScore && (
          <ScoreChip
            value={formatRawScore(media.averageScore ?? 0)}
            scrim
            className="pointer-events-none absolute top-2 right-2 z-[2]"
          />
        )}

        {/* In-library indicator — bottom-right above title */}
        {inLibrary && (
          <div className="pointer-events-none absolute bottom-[58px] right-2 z-[2]">
            <div className="w-5 h-5 rounded-full bg-status-success flex items-center justify-center shadow-[0_1px_4px_oklch(0_0_0/0.5)]">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
        )}

        {/* Bottom title block */}
        <div className="absolute inset-x-0 bottom-0 z-[1] px-[10px] pt-7 pb-[10px]">
          <h3 className="text-[12px] font-bold leading-[1.2] text-white line-clamp-2 drop-shadow-[0_1px_3px_oklch(0_0_0/0.6)]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-[3px] font-mono text-[10px] uppercase tracking-[0.08em] text-white/80 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Hover overlay — Add to library primary action */}
        {onAddToLibrary && (
          <div
            className={cn(
              'absolute inset-0 z-[3]',
              'bg-gradient-to-t from-background/70 via-background/30 to-background/5',
              'flex items-center justify-center',
              'transition-opacity duration-200',
              'opacity-0 pointer-events-none',
              'group-hover:opacity-100 group-hover:pointer-events-auto',
              'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
            )}
          >
            <button
              type="button"
              onClick={handleAddClick}
              disabled={inLibrary}
              aria-label={inLibrary ? t('card.inLibraryAria') : t('card.addToLibrary')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                'text-[11.5px] font-bold shadow-[0_6px_16px_-6px_oklch(0_0_0/0.7)]',
                'transition-colors duration-150 active:scale-[0.97]',
                inLibrary
                  ? 'bg-status-success/90 text-white cursor-default'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {inLibrary ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {t('card.inLibrary')}
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  {t('card.add')}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(DiscoverCard);
