import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatTime } from '@/components/schedule/schedule-utils';
import { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';
import { handleImageError } from '@/lib/image-utils';
import type { IAiringPosterCardProps } from './AiringTodaySection.types';

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5];

/** Skeleton placeholder row for the airing-today loading state. */
export function AiringSkeletonRow() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {SKELETON_KEYS.map(i => (
        <div key={i} className="w-[100px] shrink-0 animate-pulse">
          <div className="aspect-[3/4] rounded-lg bg-muted/40" />
          <div className="mt-1.5 h-3 w-[70%] rounded bg-muted/30" />
        </div>
      ))}
    </div>
  );
}

/** Small poster card for the airing today horizontal scroll */
export function AiringPosterCard({ entry, isUser }: IAiringPosterCardProps) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const title = getAnimeTitle(entry.media);
  const coverUrl = getCoverUrl(entry.media);
  const time = formatTime(entry.airingAt);

  return (
    <div className="w-[100px] shrink-0 group">
      <div
        className={cn(
          'relative aspect-[3/4] rounded-lg overflow-hidden border transition-all',
          isUser
            ? 'border-primary/30 shadow-[0_0_8px_-2px] shadow-primary/20'
            : 'border-border/20 hover:border-border/50'
        )}
      >
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => {
              setImgError(true);
              handleImageError(e);
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted/40" />
        )}

        {/* Time badge */}
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[10px] font-medium bg-background/80 text-foreground/80 px-1 py-px rounded">
            {time}
          </span>
        </div>

        {/* Title + episode overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
          <p className="text-2xs font-medium text-white leading-tight line-clamp-2">{title}</p>
          <p className="text-[10px] text-white/60 mt-0.5">
            {t('newTab.airingToday.episodeShort', { episode: entry.episode })}
          </p>
        </div>
      </div>
    </div>
  );
}
