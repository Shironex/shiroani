import { TooltipProvider } from '@/components/ui/tooltip';
import { useActivityHeatmap } from './ActivityHeatmap.hooks';
import { CellGrid, HeatmapLegend, MonthRow, WeekdayAxis } from './ActivityHeatmap.parts';
import type { IActivityHeatmapProps } from './ActivityHeatmap.types';

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
    <TooltipProvider delayDuration={120}>
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
