import type { ReactNode } from 'react';

export interface IWeekGridSkeletonProps {
  /** Per-column skeleton card counts — length must equal 7 (one per weekday). */
  counts: readonly number[];
  /** Tailwind class for vertical spacing between skeleton cards. */
  listClassName: string;
  /** Renders a single skeleton card for a given column + entry index. */
  renderCard: (colIdx: number, entryIdx: number) => ReactNode;
}

export type IScheduleSkeletonsView = Record<string, never>;
