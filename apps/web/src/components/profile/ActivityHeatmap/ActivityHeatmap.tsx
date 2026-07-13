import { TooltipProvider } from '@/components/ui/tooltip';
import { useActivityHeatmap } from './ActivityHeatmap.hooks';
import { CellGrid, HeatmapLegend, MonthRow, WeekdayAxis } from './ActivityHeatmap.parts';
import type { IActivityHeatmapProps } from './ActivityHeatmap.types';

/**
 * Faster tooltip open delay than the app-wide 300ms (see main.tsx): the heatmap
 * is a dense grid the user scrubs across cell-by-cell, so a snappier reveal
 * keeps the per-cell value legible while sweeping the mouse.
 */
const HEATMAP_TOOLTIP_DELAY = 120;

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
export default function ActivityHeatmap({
  snapshot,
  weeks = 12,
  metric = 'active',
}: IActivityHeatmapProps) {
  const { data, localizedWeekdays, ariaLabel, lessLabel, moreLabel } = useActivityHeatmap({
    snapshot,
    weeks,
    metric,
  });

  return (
    <TooltipProvider delayDuration={HEATMAP_TOOLTIP_DELAY}>
      <div className="flex flex-col gap-2">
        <MonthRow data={data} />

        <div className="flex gap-1.5">
          <WeekdayAxis weekdays={localizedWeekdays} />
          <CellGrid data={data} ariaLabel={ariaLabel} />
        </div>

        <HeatmapLegend lessLabel={lessLabel} moreLabel={moreLabel} />
      </div>
    </TooltipProvider>
  );
}
