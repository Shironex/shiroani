const CHART_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

export interface ICountBarRow {
  key: string;
  label: string;
  /** Right-aligned value label (e.g. "42%" or "128"). */
  valueLabel: string;
  /** Fill proportion, 0–100. */
  pct: number;
}

/**
 * Ordered horizontal-bar stack. Each row: label + value on top, a pill fill
 * underneath tinted from the categorical chart palette (cycled by index). The
 * fill animates via `scaleX` (transform, not width) so the browser can composite
 * it off the main thread.
 */
export function CountBars({ rows }: { rows: ICountBarRow[] }) {
  const bars = rows.map((row, i) => (
    <div key={row.key}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11.5px] font-medium text-foreground/90 truncate" title={row.label}>
          {row.label}
        </span>
        <span className="font-mono text-2xs text-muted-foreground tabular-nums">
          {row.valueLabel}
        </span>
      </div>
      <div className="h-[5px] rounded-full bg-foreground/7 overflow-hidden">
        <div
          className="h-full w-full origin-left transition-transform duration-700 ease-out"
          style={{
            transform: `scaleX(${Math.max(0, Math.min(100, row.pct)) / 100})`,
            backgroundColor: CHART_VARS[i % CHART_VARS.length],
          }}
        />
      </div>
    </div>
  ));

  return <div className="flex flex-col gap-2">{bars}</div>;
}
