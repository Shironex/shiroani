import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatDuration } from '@/lib/stats-conversions';
import type {
  HeatmapMetric,
  IActivityHeatmapProps,
  IActivityHeatmapView,
  ICell,
  IHeatmapData,
} from './ActivityHeatmap.types';

/**
 * Build localized short-form weekday and month label arrays for the
 * heatmap axis (9px text, so we lean on the locale's short style and
 * trim trailing dots/whitespace to keep the ticks tight).
 *
 * Anchors a known Mon→Sun and Jan→Dec window so `Intl.DateTimeFormat`
 * produces stable, ordered output regardless of the runtime's wall
 * clock.
 */
function buildHeatmapLabels(locale: string): { weekdays: string[]; months: string[] } {
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short' });

  // 2024-01-01 was a Monday — walk a full Mon→Sun week from there.
  const weekdays: string[] = [];
  for (let i = 0; i < 7; i++) {
    weekdays.push(weekdayFmt.format(new Date(2024, 0, 1 + i)).trim());
  }

  // Jan→Dec across any non-leap year — using day 15 avoids DST ambiguity.
  const months: string[] = [];
  for (let m = 0; m < 12; m++) {
    months.push(monthFmt.format(new Date(2024, m, 15)).trim());
  }

  return { weekdays, months };
}

/** Local YYYY-MM-DD — must match the tracker's day-bucket key format. */
function localDayKey(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

/** ISO weekday (Mon=0 … Sun=6) for a column-major calendar. */
function isoWeekday(date: Date): number {
  // getDay: 0=Sunday … 6=Saturday → shift to 0=Monday … 6=Sunday
  return (date.getDay() + 6) % 7;
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

function formatTooltipDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function tooltipText(
  cell: Pick<ICell, 'date' | 'seconds' | 'isFuture'>,
  metric: HeatmapMetric,
  t: TFunction<'profile'>,
  locale: string
): string {
  const date = formatTooltipDate(cell.date, locale);
  if (cell.isFuture) {
    return t('appPanel.heatmap.tooltip.future', { date });
  }
  if (cell.seconds <= 0) {
    return t('appPanel.heatmap.tooltip.empty', { date });
  }
  const value = formatDuration(cell.seconds);
  return t(`appPanel.heatmap.tooltip.${metric}`, { date, value });
}

function buildHeatmap(
  byDay: Record<string, { appActiveSeconds: number; animeWatchSeconds: number }>,
  weeks: number,
  metric: HeatmapMetric,
  monthLabelStrings: readonly string[],
  t: TFunction<'profile'>,
  locale: string,
  today: Date = new Date()
): IHeatmapData {
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
  const cells: ICell[] = [];
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
    const isFuture = key > todayKey;
    cells.push({
      date: d,
      key,
      seconds,
      level: 0,
      isFuture,
      tooltip: tooltipText({ date: d, seconds, isFuture }, metric, t, locale),
    });
  }

  for (let i = 0; i < cells.length; i++) {
    cells[i].level = bucketSeconds(cellSeconds[i], scaleMax);
  }

  // Slice into columns of 7 (Mon → Sun).
  const weekCols: ICell[][] = [];
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
      monthLabels.set(idx, monthLabelStrings[monday.getMonth()]);
      prevMonth = monday.getMonth();
    }
  });

  return { weeks: weekCols, monthLabels };
}

/**
 * GitHub-contributions-style heatmap view model. Builds the localized axis
 * labels (memoized on language) and the cell grid (rebuilt each render since
 * `snapshot.byDay` reference-changes on every store refresh — 84 cells × cheap
 * arithmetic, so useMemo would not help). Tooltip strings are pre-resolved into
 * each cell so the render layer stays pure.
 */
export function useActivityHeatmap({
  snapshot,
  weeks = 12,
  metric = 'active',
}: IActivityHeatmapProps): IActivityHeatmapView {
  const { t, i18n } = useTranslation('profile');
  const language = i18n.language || 'en';

  const { weekdays: localizedWeekdays, months: localizedMonths } = useMemo(
    () => buildHeatmapLabels(language),
    [language]
  );

  const data = buildHeatmap(snapshot.byDay, weeks, metric, localizedMonths, t, language);
  const metricLabel = t(`appPanel.heatmap.metric.${metric}`);
  const ariaLabel = t('appPanel.heatmap.ariaLabel', { metric: metricLabel, weeks });

  return {
    data,
    localizedWeekdays,
    metric,
    metricLabel,
    weeks,
    ariaLabel,
    lessLabel: t('appPanel.heatmap.less'),
    moreLabel: t('appPanel.heatmap.more'),
  };
}
