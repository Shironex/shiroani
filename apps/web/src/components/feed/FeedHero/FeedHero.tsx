import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { handleImageError } from '@/lib/image-utils';
import { readableTextColor } from '@/lib/color-utils';
import { PillTag } from '@/components/ui/pill-tag';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { useFeedHero } from './FeedHero.hooks';
import type { IFeedHeroProps } from './FeedHero.types';

/**
 * Large editorial feature card used at the top of the news feed.
 * Shows the newest/most relevant story with a gradient cover, kanji watermark,
 * Shippori-Mincho headline and metadata strip.
 */
function FeedHero({ item, onOpen }: IFeedHeroProps) {
  const { t } = useTranslation('feed');
  const { categoryLabel, published } = useFeedHero(item);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        'group relative w-full text-left rounded-xl overflow-hidden',
        'border border-border-glass',
        'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-primary-glow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      style={{
        // Fallback cover wash, derived from the brand token so it tracks the
        // active theme instead of a frozen pink/violet gradient.
        background:
          'linear-gradient(120deg, oklch(from var(--primary) 0.45 c h), oklch(from var(--primary) 0.26 c calc(h - 60)))',
      }}
    >
      {/* Background image if available. Wrapper carries the permanent 60% dim
          (keeps the headline legible); FadeInImage fades the bitmap in on load. */}
      {item.imageUrl && (
        <div className="absolute inset-0 opacity-60">
          <FadeInImage
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Decorative highlight + grain overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          background: 'radial-gradient(circle at 85% 60%, oklch(1 0 0 / 0.18), transparent 55%)',
        }}
      />
      {/* Dark bottom gradient to keep text legible */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, oklch(0 0 0 / 0) 20%, oklch(0 0 0 / 0.55) 100%)',
        }}
      />

      {/* Clipped kanji watermark layer — 報 (news / report) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <KanjiWatermark
          kanji="報"
          position="tr"
          size={200}
          opacity={0.08}
          className="!text-white"
        />
      </div>

      {/* Content */}
      <div className="relative z-[1] flex flex-col gap-2 p-5 sm:p-6 min-h-[180px]">
        {/* Over-image scrim chips — white/black alphas are intentional here so
            the pills stay legible on top of the cover art (not theme surfaces). */}
        <div className="flex flex-wrap items-center gap-1.5">
          <PillTag className="bg-white/20 text-white/95">{t('hero.featured')}</PillTag>
          <PillTag className="bg-black/35 text-white/95">{categoryLabel}</PillTag>
          <PillTag
            style={{
              backgroundColor: item.sourceColor,
              color: readableTextColor(item.sourceColor),
            }}
          >
            {item.sourceName}
          </PillTag>
        </div>

        <h2
          className={cn(
            'font-serif font-extrabold text-white/95',
            'text-[20px] sm:text-[22px] leading-[1.2] tracking-[-0.02em]',
            'max-w-[640px] line-clamp-2 mt-1'
          )}
        >
          {item.title}
        </h2>

        {item.description && (
          <p className="text-[12.5px] leading-[1.5] text-white/85 max-w-[680px] line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] tracking-[0.1em] uppercase text-white/80">
          <span>{item.sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.publishedAt ?? item.createdAt}>{published}</time>
          {item.author && (
            <>
              <span aria-hidden="true">·</span>
              <span className="normal-case tracking-normal text-white/75">{item.author}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export default memo(FeedHero);
