import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChannelButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function ChannelButton({ active, disabled, onClick, children }: ChannelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-[6px] rounded-lg border text-[12px] font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        active
          ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
          : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
