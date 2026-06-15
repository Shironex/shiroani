import type { AppStatsSnapshot } from '@shiroani/shared';

export type HeatmapMetric = 'active' | 'anime';

export interface IActivityHeatmapProps {
  snapshot: AppStatsSnapshot;
  /** How many trailing weeks to render. Defaults to 12 (~3 months). */
  weeks?: number;
  /**
   * Which counter drives the color intensity.
   *  - "active" → `appActiveSeconds` (default — the "real" engagement number).
   *  - "anime"  → `animeWatchSeconds` (sparser, but a stronger story).
   */
  metric?: HeatmapMetric;
}

export interface ICell {
  date: Date;
  key: string;
  seconds: number;
  /** 0 = empty, 1–4 = intensity bucket. */
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
  /** Pre-resolved, locale-aware tooltip text (computed in the hook). */
  tooltip: string;
}

export interface IHeatmapData {
  /** Outer array: weeks (oldest → newest). Inner: 7 days (Mon → Sun). */
  weeks: ICell[][];
  /** Month labels keyed by week index (only for weeks that contain a 1st-of-month). */
  monthLabels: Map<number, string>;
}

export interface IActivityHeatmapView {
  readonly data: IHeatmapData;
  readonly localizedWeekdays: string[];
  readonly metric: HeatmapMetric;
  readonly metricLabel: string;
  readonly weeks: number;
  readonly ariaLabel: string;
  readonly lessLabel: string;
  readonly moreLabel: string;
}
