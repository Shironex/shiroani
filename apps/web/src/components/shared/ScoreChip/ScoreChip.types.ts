import type { HTMLAttributes } from 'react';

export interface IScoreChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Pre-formatted score value (e.g. "8.4"). Rendered with tabular figures. */
  value: string | number;
  /**
   * Over-image variant — adds a dark scrim so the gold text stays legible when
   * the chip floats over a cover/banner.
   */
  scrim?: boolean;
}

export type IScoreChipView = Record<string, never>;
