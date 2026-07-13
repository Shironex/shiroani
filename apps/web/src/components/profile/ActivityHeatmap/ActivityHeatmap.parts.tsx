import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { IActivityHeatmapView } from './ActivityHeatmap.types';

const LEVEL_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  // Plain border-glass tone, no fill.
  0: 'bg-foreground/[0.04] border-border-glass/60',
  // Primary at increasing alpha — same hue as the rest of the app, no clash
  // with the Spy×Family palette which is already primary-led.
  1: 'bg-[oklch(from_var(--primary)_l_c_h/0.18)] border-[oklch(from_var(--primary)_l_c_h/0.25)]',
  2: 'bg-[oklch(from_var(--primary)_l_c_h/0.38)] border-[oklch(from_var(--primary)_l_c_h/0.45)]',
  3: 'bg-[oklch(from_var(--primary)_l_c_h/0.6)] border-[oklch(from_var(--primary)_l_c_h/0.65)]',
  4: 'bg-[oklch(from_var(--primary)_l_c_h/0.85)] border-[oklch(from_var(--primary)_l_c_h/0.85)]',
};

const LEGEND_LEVELS = [0, 1, 2, 3, 4] as const;

/** Month-strip header above the cell grid (one label per first-of-month week). */
export function MonthRow({ data }: { data: IActivityHeatmapView['data'] }) {
  return (
    <div
      className="grid gap-[3px] pl-7 font-mono text-2xs uppercase tracking-[0.16em] text-muted-foreground"
      style={{ gridTemplateColumns: `repeat(${data.weeks.length}, 12px)` }}
      aria-hidden="true"
    >
      {data.weeks.map((_, idx) => (
        <span key={idx} className="text-left">
          {data.monthLabels.get(idx) ?? ''}
        </span>
      ))}
    </div>
  );
}

/** Weekday axis labels (Mon, Wed, Fri only). */
export function WeekdayAxis({ weekdays }: { weekdays: string[] }) {
  return (
    <div
      className="grid grid-rows-7 gap-[3px] font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground/80 pt-px"
      aria-hidden="true"
    >
      {weekdays.map((label, idx) => (
        <div key={`${label}-${idx}`} className="h-3 leading-3">
          {idx % 2 === 1 ? label : ''}
        </div>
      ))}
    </div>
  );
}

/** The 7×N cell grid — each cell is a flat tinted div wrapped in a tooltip. */
export function CellGrid({
  data,
  ariaLabel,
}: {
  data: IActivityHeatmapView['data'];
  ariaLabel: string;
}) {
  return (
    <div
      role="grid"
      aria-label={ariaLabel}
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${data.weeks.length}, 12px)` }}
    >
      {data.weeks.map((week, weekIdx) => (
        <div key={weekIdx} role="row" className="grid grid-rows-7 gap-[3px]">
          {week.map(cell => (
            <Tooltip key={cell.key}>
              <TooltipTrigger asChild>
                <div
                  role="gridcell"
                  aria-label={cell.tooltip}
                  tabIndex={0}
                  className={`w-3 h-3 rounded-xs border outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    LEVEL_BG[cell.level]
                  } ${cell.isFuture ? 'opacity-30' : ''}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">
                {cell.tooltip}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Less→more intensity legend. */
export function HeatmapLegend({ lessLabel, moreLabel }: { lessLabel: string; moreLabel: string }) {
  return (
    <div className="flex items-center gap-2 pl-7 font-mono text-2xs uppercase tracking-[0.16em] text-muted-foreground">
      <span>{lessLabel}</span>
      {LEGEND_LEVELS.map(level => (
        <span
          key={level}
          className={`w-3 h-3 rounded-xs border ${LEVEL_BG[level]}`}
          aria-hidden="true"
        />
      ))}
      <span>{moreLabel}</span>
    </div>
  );
}
