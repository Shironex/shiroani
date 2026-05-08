import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AppStatsSnapshot } from '@shiroani/shared';
import { formatPolishDuration } from '@/lib/stats-conversions';

interface ActivityHeatmapProps {
  snapshot: AppStatsSnapshot;
  /** How many trailing weeks to render. Defaults to 12 (~3 months). */
  weeks?: number;
  /**
   * Which counter drives the color intensity.
   *  - "active" → `appActiveSeconds` (default — the "real" engagement number).
   *  - "anime"  → `animeWatchSeconds` (sparser, but a stronger story).
   */
  metric?: 'active' | 'anime';
}

const POLISH_WEEKDAYS = ['pn.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'nd.'] as const;
const POLISH_MONTHS = [
  'sty',
  'lut',
  'mar',
  'kwi',
  'maj',
  'cze',
  'lip',
  'sie',
  'wrz',
  'paź',
  'lis',
  'gru',
] as const;

/** Local YYYY-MM-DD — must match the tracker's day-bucket key format. */
function localDayKey(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

/** ISO weekday (Mon=0 … Sun=6) for a column-major calendar. */
function isoWeekday(date: Date): number {
  // getDay: 0=Sunday … 6=Saturday → shift to 0=Monday … 6=Sunday
  return (date.getDay() + 6) % 7;
}

interface Cell {
  date: Date;
  key: string;
  seconds: number;
  /** 0 = empty, 1–4 = intensity bucket. */
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
}

interface HeatmapData {
  /** Outer array: weeks (oldest → newest). Inner: 7 days (Mon → Sun). */
  weeks: Cell[][];
  /** Month labels keyed by week index (only for weeks that contain a 1st-of-month). */
  monthLabels: Map<number, string>;
}

function bucketSeconds(seconds: number, scaleMax: number): 0 | 1 | 2 | 3 | 4 {
  if (seconds <= 0) return 0;
  if (scaleMax <= 0) return 1;
  const ratio = seconds / scaleMax;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

function buildHeatmap(
  byDay: Record<string, { appActiveSeconds: number; animeWatchSeconds: number }>,
  weeks: number,
  metric: 'active' | 'anime',
  today: Date = new Date()
): HeatmapData {
  const todayKey = localDayKey(today);
  const todayWeekday = isoWeekday(today); // 0 = Mon … 6 = Sun
  const totalDays = weeks * 7;

  // Anchor the rightmost column on the Sunday of "this" ISO week, then walk
  // back `weeks` columns of 7 days. Future cells in the trailing column
  // (when today is mid-week) render dimmed via `isFuture`.
  const endSunday = new Date(today);
  endSunday.setHours(0, 0, 0, 0);
  endSunday.setDate(endSunday.getDate() + (6 - todayWeekday));
  const startMonday = new Date(endSunday);
  startMonday.setDate(endSunday.getDate() - (totalDays - 1));

  // Compute scale-max from the rendered window only — keeps the gradient
  // meaningful even when the user has 50× more activity in week 1 vs. week 12.
  let scaleMax = 0;
  const cellSeconds: number[] = [];
  const cells: Cell[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    const key = localDayKey(d);
    const bucket = byDay[key];
    const seconds = bucket
      ? metric === 'active'
        ? bucket.appActiveSeconds
        : bucket.animeWatchSeconds
      : 0;
    cellSeconds.push(seconds);
    if (seconds > scaleMax) scaleMax = seconds;
    cells.push({
      date: d,
      key,
      seconds,
      level: 0,
      isFuture: key > todayKey,
    });
  }

  for (let i = 0; i < cells.length; i++) {
    cells[i].level = bucketSeconds(cellSeconds[i], scaleMax);
  }

  // Slice into columns of 7 (Mon → Sun).
  const weekCols: Cell[][] = [];
  for (let w = 0; w < weeks; w++) {
    weekCols.push(cells.slice(w * 7, w * 7 + 7));
  }

  // First-of-month markers — surface a header label above the column whose
  // Monday falls in a different month from the previous column's Monday.
  const monthLabels = new Map<number, string>();
  let prevMonth = -1;
  weekCols.forEach((week, idx) => {
    const monday = week[0].date;
    if (monday.getMonth() !== prevMonth) {
      monthLabels.set(idx, POLISH_MONTHS[monday.getMonth()]);
      prevMonth = monday.getMonth();
    }
  });

  return { weeks: weekCols, monthLabels };
}

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

function formatTooltipDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * GitHub-contributions-style heatmap of the last `weeks` of activity.
 *
 * Performance notes:
 *  - No backdrop-blur, no will-change, no hover-scale (project memory:
 *    `feedback_gpu_layers`). Cells are flat tinted divs that don't promote
 *    layers when the user mouses over them.
 *  - 12 weeks × 7 days = 84 cells. Each cell wraps a Radix Tooltip — Tooltip
 *    portals are mount-on-demand, so the off-screen DOM cost is constant.
 */
export function ActivityHeatmap({ snapshot, weeks = 12, metric = 'active' }: ActivityHeatmapProps) {
  const { t, i18n } = useTranslation('profile');
  // 84 cells × cheap arithmetic — useMemo wouldn't help since `snapshot.byDay`
  // is a fresh object reference on every store refresh.
  const data = buildHeatmap(snapshot.byDay, weeks, metric);
  const metricLabel = t(`appPanel.heatmap.metric.${metric}`);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col gap-2">
        {/* Month-label row */}
        <div
          className="grid gap-[3px] pl-7 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${data.weeks.length}, 12px)` }}
          aria-hidden="true"
        >
          {data.weeks.map((_, idx) => (
            <span key={idx} className="text-left">
              {data.monthLabels.get(idx) ?? ''}
            </span>
          ))}
        </div>

        <div className="flex gap-1.5">
          {/* Weekday labels (Mon, Wed, Fri) */}
          <div
            className="grid grid-rows-7 gap-[3px] font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80 pt-px"
            aria-hidden="true"
          >
            {POLISH_WEEKDAYS.map((label, idx) => (
              <div key={label} className="h-3 leading-3">
                {idx % 2 === 1 ? label : ''}
              </div>
            ))}
          </div>

          {/* Cell grid */}
          <div
            role="grid"
            aria-label={t('appPanel.heatmap.ariaLabel', { metric: metricLabel, weeks })}
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${data.weeks.length}, 12px)` }}
          >
            {data.weeks.map((week, weekIdx) => (
              <div key={weekIdx} role="row" className="grid grid-rows-7 gap-[3px]">
                {week.map(cell => {
                  const text = tooltipText(cell, metric, t, i18n.language);
                  return (
                    <Tooltip key={cell.key}>
                      <TooltipTrigger asChild>
                        <div
                          role="gridcell"
                          aria-label={text}
                          className={`w-3 h-3 rounded-[3px] border ${LEVEL_BG[cell.level]} ${
                            cell.isFuture ? 'opacity-30' : ''
                          }`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[11px]">
                        {text}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 pl-7 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>{t('appPanel.heatmap.less')}</span>
          {[0, 1, 2, 3, 4].map(level => (
            <span
              key={level}
              className={`w-3 h-3 rounded-[3px] border ${LEVEL_BG[level as 0 | 1 | 2 | 3 | 4]}`}
              aria-hidden="true"
            />
          ))}
          <span>{t('appPanel.heatmap.more')}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}

function tooltipText(
  cell: Cell,
  metric: 'active' | 'anime',
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string
): string {
  const date = formatTooltipDate(cell.date, locale);
  if (cell.isFuture) {
    return t('appPanel.heatmap.tooltip.future', { date });
  }
  if (cell.seconds <= 0) {
    return t('appPanel.heatmap.tooltip.empty', { date });
  }
  const value = formatPolishDuration(cell.seconds);
  return t(`appPanel.heatmap.tooltip.${metric}`, { date, value });
}
