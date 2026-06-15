import type { ReactNode } from 'react';

/**
 * Variant of the timeline dot marker.
 *
 * - `solid`   — filled with the accent color; paired with a glow ring.
 * - `outline` — transparent centre with a colored stroke (default).
 * - `dashed`  — dashed stroke; used for the tail / end-of-history marker.
 */
export type TimelineMarkerVariant = 'solid' | 'outline' | 'dashed';

export type TimelineEntry = {
  /** Stable React key. Also used as the anchor id. */
  id: string;
  /** Optional fully custom marker node. When supplied, `markerVariant` is ignored. */
  marker?: ReactNode;
  /** Default dot-style marker variant. Defaults to `outline`. */
  markerVariant?: TimelineMarkerVariant;
  /**
   * Optional headline rendered in the left column (appears above `timestamp`).
   * In the changelog this is the version number (`v0.5.0`); in the diary it
   * could be the day-of-week label.
   */
  title?: ReactNode;
  /** Small mono-uppercase label rendered below `title` in the left column. */
  timestamp?: ReactNode;
  /** Main content — right column. */
  children: ReactNode;
};

export type TimelineProps = {
  entries: TimelineEntry[];
  /** Optional outer className. */
  className?: string;
  /**
   * Fixed width of the left column in px (timestamp / title area).
   * Default 76. On narrow screens the layout collapses to a single column.
   */
  sideWidth?: number;
  /** Horizontal gap in px between the vertical line and the content column. Default 48. */
  gap?: number;
};

export type ITimelineProps = TimelineProps;

export type ITimelineView = Record<string, never>;
