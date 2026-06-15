import { cn } from '@/lib/utils';
import type { TimelineMarkerVariant } from './Timeline.types';

interface TimelineDotProps {
  variant?: TimelineMarkerVariant;
}

/**
 * Default circular marker used by the timeline.
 *
 * - `outline`: hollow accent-ringed dot with a subtle halo.
 * - `solid`:   filled accent dot with a stronger halo (used for the latest entry).
 * - `dashed`:  muted dashed stroke (used at the end of a closed history).
 */
export function TimelineDot({ variant = 'outline' }: TimelineDotProps) {
  if (variant === 'dashed') {
    return (
      <span
        className={cn(
          'block h-3 w-3 rounded-full border-2 border-dashed border-border-glass',
          'bg-background'
        )}
        style={{ boxShadow: '0 0 0 4px var(--background)' }}
      />
    );
  }
  if (variant === 'solid') {
    return (
      <span
        className="block h-3 w-3 rounded-full bg-primary"
        style={{
          boxShadow:
            '0 0 0 4px var(--background), 0 0 18px oklch(from var(--primary) l c h / 0.55)',
        }}
      />
    );
  }
  return (
    <span
      className="block h-3 w-3 rounded-full border-2 border-primary bg-background"
      style={{
        boxShadow: '0 0 0 4px var(--background), 0 0 12px oklch(from var(--primary) l c h / 0.35)',
      }}
    />
  );
}
