import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useRandomPeekChip } from './RandomPeekChip.hooks';
import type { IRandomPeekChipProps } from './RandomPeekChip.types';

function RandomPeekChip({ media, direction, onClick, inLibrary }: IRandomPeekChipProps) {
  const { cover, title, ariaLabel, arrowLabel } = useRandomPeekChip({ media, direction });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 max-w-[45%] min-w-0 p-1.5 rounded-[10px]',
        'bg-card/40 hover:bg-card/70 border border-border-glass transition-colors',
        direction === 'next' && 'flex-row-reverse'
      )}
      aria-label={ariaLabel}
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
          {arrowLabel}
        </p>
        <p className="text-[11px] font-medium text-foreground/80 truncate leading-tight mt-[2px]">
          {title}
          {inLibrary && <span className="ml-1 text-status-success">✓</span>}
        </p>
      </div>
    </button>
  );
}

export default memo(RandomPeekChip);
