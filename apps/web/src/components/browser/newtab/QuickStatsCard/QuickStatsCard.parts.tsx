import { cn } from '@/lib/utils';
import type { IStatTileProps } from './QuickStatsCard.types';

export function StatTile({ icon: Icon, label, value, tone }: IStatTileProps) {
  return (
    <div className="rounded-[10px] border border-border-glass bg-foreground/[0.04] px-3 py-3">
      <Icon
        className={cn(
          'w-3.5 h-3.5 mb-2',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-muted-foreground'
        )}
      />
      <div
        className={cn(
          'font-sans font-extrabold text-[20px] leading-[1.1] tracking-[-0.02em] tabular-nums',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </div>
    </div>
  );
}
