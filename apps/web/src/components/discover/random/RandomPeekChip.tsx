import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { getTitle } from './random-utils';

interface RandomPeekChipProps {
  media: DiscoverMedia;
  direction: 'prev' | 'next';
  onClick: () => void;
  inLibrary: boolean;
}

export const RandomPeekChip = memo(function RandomPeekChip({
  media,
  direction,
  onClick,
  inLibrary,
}: RandomPeekChipProps) {
  const { t } = useTranslation('discover');
  const cover = media.coverImage.medium || media.coverImage.large;
  const title = getTitle(media.title);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 max-w-[45%] min-w-0 p-1.5 rounded-[10px]',
        'bg-card/40 hover:bg-card/70 border border-border-glass transition-colors',
        direction === 'next' && 'flex-row-reverse'
      )}
      aria-label={t('random.peekLabel', {
        direction: direction === 'prev' ? t('random.previousLabel') : t('random.nextLabel'),
        title,
      })}
    >
      {cover ? (
        <img
          src={cover}
          alt=""
          aria-hidden
          className="w-8 h-10 object-cover rounded-[4px] shrink-0"
        />
      ) : (
        <div className="w-8 h-10 rounded-[4px] bg-muted shrink-0" />
      )}
      <div className={cn('min-w-0', direction === 'next' ? 'text-right' : 'text-left')}>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground/70 leading-tight">
          {direction === 'prev' ? t('random.previousArrow') : t('random.nextArrow')}
        </p>
        <p className="text-[11px] font-medium text-foreground/80 truncate leading-tight mt-[2px]">
          {title}
          {inLibrary && <span className="ml-1 text-status-success">✓</span>}
        </p>
      </div>
    </button>
  );
});
