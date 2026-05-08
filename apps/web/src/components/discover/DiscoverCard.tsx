import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Film, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { formatScore } from '@/lib/anime-utils';
import { getAnilistFormatLabel, getAnilistStatusLabel } from '@/lib/constants';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

interface DiscoverCardProps {
  media: DiscoverMedia;
  inLibrary?: boolean;
  onClick?: () => void;
  onAddToLibrary?: (media: DiscoverMedia) => void;
}

function getTitle(title: DiscoverMedia['title']): string {
  return title.english || title.romaji || title.native || '?';
}

const DiscoverCard = memo(function DiscoverCard({
  media,
  inLibrary,
  onClick,
  onAddToLibrary,
}: DiscoverCardProps) {
  // Re-render on language change so the format/status label getters refresh.
  useTranslation('anilist');
  const { t } = useTranslation('discover');
  const [imgError, setImgError] = useState(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  const handleImageError = useCallback(() => setImgError(true), []);

  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!inLibrary) onAddToLibrary?.(media);
    },
    [inLibrary, onAddToLibrary, media]
  );

  const coverUrl = media.coverImage.large || media.coverImage.extraLarge || media.coverImage.medium;
  const title = getTitle(media.title);
  const formatLabel = media.format ? getAnilistFormatLabel(media.format) : null;
  const statusLabel = media.status ? getAnilistStatusLabel(media.status) : null;

  const episodeInfo = media.episodes ? t('card.episodeCount', { count: media.episodes }) : null;
  const subtitle = [episodeInfo, statusLabel].filter(Boolean).join(' \u00B7 ');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      className={cn(
        'group relative rounded-[10px] overflow-hidden cursor-pointer',
        'border border-border-glass bg-card/60',
        'transition-transform duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-primary-glow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-translate-y-0.5'
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Cover — 2:3 aspect, matching Library card vocabulary */}
      <div className="relative aspect-[2/3] overflow-hidden">
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
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

        {/* Format pill — top-left */}
        {formatLabel && (
          <div className="absolute top-2 left-2 z-[2]">
            <PillTag variant="muted" className="shadow-[0_1px_4px_oklch(0_0_0/0.5)]">
              {formatLabel}
            </PillTag>
          </div>
        )}

        {/* Score chip — top-right, mono with star */}
        {media.averageScore != null && media.averageScore > 0 && (
          <div
            className={cn(
              'absolute top-2 right-2 z-[2]',
              'flex items-center gap-[3px] px-[6px] py-[3px] rounded-[3px]',
              'bg-black/70 text-[10px] font-mono font-bold leading-none',
              'text-[oklch(0.8_0.14_70)]'
            )}
          >
            <Star className="w-3 h-3 fill-current" strokeWidth={0} />
            <span className="tabular-nums">{formatScore(media.averageScore)}</span>
          </div>
        )}

        {/* In-library indicator — bottom-right above title */}
        {inLibrary && (
          <div className="absolute bottom-[58px] right-2 z-[2]">
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
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px]',
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
});

export { DiscoverCard };
