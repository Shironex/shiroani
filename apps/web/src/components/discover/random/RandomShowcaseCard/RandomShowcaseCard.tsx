import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shuffle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Star,
  Check,
  Film,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { PillTag } from '@/components/ui/pill-tag';
import { formatRawScore } from '@/lib/anime-utils';
import { useRandomShowcaseCard } from './RandomShowcaseCard.hooks';
import { GenreTags } from './RandomShowcaseCard.parts';
import type { IRandomShowcaseCardProps } from './RandomShowcaseCard.types';

/**
 * Hero showcase card for the Random tab — borrows the News.html `.feature`
 * anatomy (gradient background, top-right kanji watermark, big serif title,
 * meta row) and pairs it with a poster column on the left.
 */
function RandomShowcaseCard({
  media,
  index,
  total,
  inLibrary,
  isLoading,
  onPrev,
  onNext,
  onRefetch,
  onOpenDetails,
  onAddToLibrary,
}: IRandomShowcaseCardProps) {
  const { t } = useTranslation('discover');
  const {
    meta,
    lqip,
    showRomaji,
    imgLoaded,
    setImgLoaded,
    showLqip,
    showSkeletonShimmer,
    hasScore,
    hasGenres,
    genres,
    showAddButton,
  } = useRandomShowcaseCard({ media, inLibrary, onAddToLibrary });

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 p-5 md:p-7">
      {/* Editorial kanji watermark — top-right, News-hero style */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[-18px] right-[-10px] font-serif font-extrabold leading-none tracking-[-0.05em] text-foreground/[0.07] select-none"
        style={{ fontSize: '160px' }}
      >
        籤
      </span>

      {/* ── Poster column ─────────────────────────────────────────── */}
      <div className="relative z-[1] flex items-center justify-center gap-2 md:flex-col md:items-stretch">
        <button
          type="button"
          onClick={onPrev}
          aria-label={t('random.previous')}
          className="md:hidden p-2 rounded-full bg-background/60 hover:bg-background/90 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDetails}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenDetails();
            }
          }}
          className={cn(
            'group relative aspect-[2/3] w-full max-w-[220px] mx-auto md:max-w-none',
            'rounded-[12px] overflow-hidden cursor-pointer',
            'border border-border-glass shadow-[0_8px_28px_oklch(0_0_0/0.5)]',
            'transition-all duration-300',
            'hover:shadow-primary-glow hover:scale-[1.02]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {meta.cover ? (
            <>
              {/* Low-res blurred preview — fills instantly while large cover loads */}
              {showLqip && (
                <img
                  src={lqip}
                  alt=""
                  aria-hidden
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover scale-110 blur-md transition-opacity duration-300',
                    imgLoaded ? 'opacity-0' : 'opacity-100'
                  )}
                />
              )}
              {/* Skeleton shimmer when no LQIP available */}
              {showSkeletonShimmer && (
                <div className="absolute inset-0 bg-muted/40 animate-pulse" />
              )}
              <img
                key={media.id}
                src={meta.cover}
                alt={meta.title}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
                className={cn(
                  'relative w-full h-full object-cover transition-all duration-500 group-hover:scale-105',
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                )}
              />
              {/* Sheen overlay matching Library cov::after */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.18), transparent 55%)',
                }}
              />
            </>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Film className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          {inLibrary && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-status-success flex items-center justify-center shadow-[0_1px_6px_oklch(0_0_0/0.5)]">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {hasScore && (
            <div
              className={cn(
                'absolute bottom-2 left-2',
                'flex items-center gap-[3px] px-[6px] py-[3px] rounded-[3px]',
                'bg-black/70 text-[10px] font-mono font-bold leading-none',
                'text-[oklch(0.8_0.14_70)]'
              )}
            >
              <Star className="w-3 h-3 fill-current" strokeWidth={0} />
              <span className="tabular-nums">{formatRawScore(media.averageScore ?? 0)}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label={t('random.next')}
          className="md:hidden p-2 rounded-full bg-background/60 hover:bg-background/90 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Info column — News hero anatomy ──────────────────────── */}
      <div className="relative z-[1] flex flex-col min-w-0">
        {/* Tag row — FEATURE + library + format/year */}
        <div className="flex flex-wrap items-center gap-1.5">
          <PillTag variant="accent">{t('random.featuredTag')}</PillTag>
          {inLibrary && <PillTag variant="green">{t('random.inLibraryTag')}</PillTag>}
          {meta.formatLabel && <PillTag variant="muted">{meta.formatLabel}</PillTag>}
          {meta.yearLabel && <PillTag variant="muted">{meta.yearLabel}</PillTag>}
        </div>

        {/* Title — Shippori Mincho serif, matches News .feature h2 */}
        <h2
          className={cn(
            'mt-3 font-serif font-extrabold text-foreground',
            'text-[22px] md:text-[26px] leading-[1.15] tracking-[-0.02em]',
            'line-clamp-2 cursor-pointer hover:text-primary transition-colors'
          )}
          onClick={onOpenDetails}
        >
          {meta.title}
        </h2>
        {showRomaji && (
          <p className="mt-1 font-serif text-[12.5px] text-muted-foreground/80 truncate tracking-[0.02em]">
            {media.title.romaji}
          </p>
        )}

        {/* Meta row — mono, News-hero style */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
          <span className="text-primary/90 font-semibold">
            {t('random.indexFormat', { index: index + 1, total })}
          </span>
          {media.episodes && (
            <>
              <span aria-hidden>·</span>
              <span>{t('card.episodeCount', { count: media.episodes })}</span>
            </>
          )}
          {meta.statusLabel && (
            <>
              <span aria-hidden>·</span>
              <span>{meta.statusLabel}</span>
            </>
          )}
        </div>

        {/* Genres */}
        {hasGenres && <GenreTags genres={genres} />}

        {/* Synopsis */}
        {meta.synopsis && (
          <p className="mt-3 text-[12.5px] leading-[1.65] text-foreground/75 line-clamp-5">
            {meta.synopsis}
          </p>
        )}

        {/* Action row */}
        <div className="mt-auto pt-5 flex items-center flex-wrap gap-2">
          <Button size="sm" onClick={onNext} disabled={isLoading} className="gap-1.5">
            <Shuffle className="w-3.5 h-3.5" />
            {t('random.shuffle')}
          </Button>
          {showAddButton && (
            <Button size="sm" variant="outline" onClick={onAddToLibrary} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {t('random.addToLibrary')}
            </Button>
          )}
          <TooltipButton
            size="sm"
            variant="outline"
            onClick={onRefetch}
            disabled={isLoading}
            tooltip={t('random.refreshTooltip')}
            tooltipSide="top"
            className="px-2"
            aria-label={t('random.refreshAria')}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </TooltipButton>

          {/* Desktop nav arrows */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={onPrev}
              aria-label={t('random.previous')}
              className="p-1.5 rounded-lg bg-background/40 hover:bg-background/70 border border-border-glass transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label={t('random.next')}
              className="p-1.5 rounded-lg bg-background/40 hover:bg-background/70 border border-border-glass transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 hidden sm:block">
          {t('random.keyboardHint')}
        </p>
      </div>
    </div>
  );
}

export default memo(RandomShowcaseCard);
