import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IVoteButtonProps } from './RecommendationCard.types';

export function VoteButton({ active, disabled, direction, label, onClick }: IVoteButtonProps) {
  const Icon = direction === 'up' ? ThumbsUp : ThumbsDown;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1.5 transition-colors',
        'border border-border-glass',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? direction === 'up'
            ? 'bg-status-success/20 text-status-success border-status-success/40'
            : 'bg-destructive/15 text-destructive border-destructive/40'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
      )}
    >
      <Icon className="w-3.5 h-3.5" fill={active ? 'currentColor' : 'none'} strokeWidth={2} />
    </button>
  );
}
