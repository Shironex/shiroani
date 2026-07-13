import type { ReactNode } from 'react';

/** One reflected setting in the summary list: icon + label on the left, value on the right. */
export function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-glass bg-foreground/[0.02] px-3 py-2.5 text-xs">
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span
        className={
          'min-w-0 truncate text-right font-mono text-2xs font-semibold tracking-[0.05em] ' +
          (highlight ? 'text-primary' : 'text-foreground')
        }
      >
        {value}
      </span>
    </div>
  );
}
