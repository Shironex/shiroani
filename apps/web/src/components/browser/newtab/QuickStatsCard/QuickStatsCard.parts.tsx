import { cn } from '@/lib/utils';
import type { IStatTileProps } from './QuickStatsCard.types';

// Single source of truth for the accent color a tone contributes; both the icon
// and the value read from it so gold/accent never drift between the two.
const TONE_CLASS = {
  accent: 'text-primary',
  gold: 'text-gold',
} as const;

export function StatTile({ icon: Icon, label, value, tone }: IStatTileProps) {
  const toneClass = tone ? TONE_CLASS[tone] : undefined;
  return (
    <div className="rounded-lg border border-border-glass bg-foreground/[0.04] px-3 py-3">
      <Icon className={cn('w-3.5 h-3.5 mb-2', toneClass ?? 'text-muted-foreground')} />
      <div
        className={cn(
          'font-sans font-extrabold text-[20px] leading-[1.1] tracking-[-0.02em] tabular-nums',
          toneClass ?? 'text-foreground'
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </div>
    </div>
  );
}
