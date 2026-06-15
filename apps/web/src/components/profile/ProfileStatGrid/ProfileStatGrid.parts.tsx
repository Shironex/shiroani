import { cn } from '@/lib/utils';

/** Single headline stat tile (label + big value + optional sub-line). */
export function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'accent' | 'gold';
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl bg-foreground/[0.025] border border-border-glass">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          'font-sans font-extrabold text-[28px] tracking-[-0.03em] leading-none tabular-nums',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-muted-foreground/80 mt-1">{sub}</div>}
    </div>
  );
}
