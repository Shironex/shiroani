import type * as React from 'react';

export type ProgressBarTone = 'primary' | 'muted' | 'info';

/**
 * Thin horizontal progress bar with optional accent glow.
 * Redesign idiom — used on anime cards, news trending rows, diary streak.
 */
export interface IProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Ignored when `indeterminate` is true. */
  value?: number;
  /** Bar thickness in px (default 3) */
  thickness?: number;
  /** When true, primary glow is rendered under the filled track */
  glow?: boolean;
  /** Override the fill colour */
  tone?: ProgressBarTone;
  /** Render a sliding gradient instead of a determinate fill. Used for splash + other "unknown duration" loads. */
  indeterminate?: boolean;
}

export interface IProgressBarView {
  readonly clamped: number;
  readonly fillClass: string;
  readonly toneVar: string;
}
