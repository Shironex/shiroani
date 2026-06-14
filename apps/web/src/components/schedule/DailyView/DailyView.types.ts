import type { RefObject } from 'react';
import type { AiringAnime } from '@shiroani/shared';

export interface IDailyViewProps {
  entries: AiringAnime[];
  /** YYYY-MM-DD — the day being rendered (drives the "is today" check) */
  day: string;
  onAnimeClick?: (anime: AiringAnime) => void;
}

/**
 * Per-hour layout block describing either an hour's worth of content or a
 * coalesced empty stretch ("Xh ciszy"). We pre-compute these so slot positions
 * and the live-now indicator stay consistent across the whole rail.
 */
export interface IHourBlockContent {
  kind: 'hour';
  /** Hour index relative to dayStart (0–29, can overflow past 24 for cross-midnight airings). */
  hour: number;
  top: number;
  height: number;
  slots: AiringAnime[];
}

export interface IHourBlockGap {
  kind: 'gap';
  startHour: number;
  endHour: number;
  top: number;
  height: number;
}

export type IHourBlock = IHourBlockContent | IHourBlockGap;

/** A single gutter time label positioned against the rail. */
export interface IHourMark {
  key: string;
  top: number;
  label: string;
  muted: boolean;
}

/** Everything the shell + presentational parts consume from `useDailyView`. */
export interface IDailyViewView {
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Current unix timestamp — shared clock tick for every slot + the live line. */
  now: number;
  blocks: IHourBlock[];
  railHeight: number;
  hourMarks: IHourMark[];
  nowTop: number | null;
  nowLabel: string;
  isToday: boolean;
}
