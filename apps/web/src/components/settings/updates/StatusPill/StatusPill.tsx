import { cn } from '@/lib/utils';
import { useStatusPill } from './StatusPill.hooks';
import type { IStatusPillProps } from './StatusPill.types';

export default function StatusPill({ tone, text }: IStatusPillProps) {
  useStatusPill();

  const toneClass = {
    green:
      'bg-[oklch(from_var(--status-success)_l_c_h/0.12)] border-[oklch(from_var(--status-success)_l_c_h/0.3)] text-status-success',
    accent: 'bg-primary/12 border-primary/30 text-primary',
    destructive: 'bg-destructive/12 border-destructive/30 text-destructive',
    muted: 'bg-muted/15 border-border-glass text-muted-foreground',
  }[tone];

  const dotClass = {
    green: 'bg-status-success shadow-[0_0_8px_oklch(from_var(--status-success)_l_c_h/0.6)]',
    accent: 'bg-primary shadow-[0_0_8px_oklch(from_var(--primary)_l_c_h/0.6)]',
    destructive: 'bg-destructive',
    muted: 'bg-muted-foreground/60',
  }[tone];

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold',
        toneClass
      )}
    >
      <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotClass)} />
      <span className="leading-tight">{text}</span>
    </div>
  );
}
