import type { ReactNode } from 'react';

export interface IProgressRingProps {
  /** 0–100 */
  value: number;
  /** Diameter in px (default 72) */
  size?: number;
  /** Stroke width in px (default 6) */
  strokeWidth?: number;
  /**
   * Stroke colour for the filled arc. Accepts any CSS colour string,
   * typically an `oklch(...)` value or a CSS variable. Defaults to
   * `var(--primary)`.
   */
  stroke?: string;
  /** Optional label under the ring (JetBrains Mono, uppercase, muted) */
  label?: string;
  /**
   * Value text override. Defaults to `{value}%`. Pass empty string to hide.
   */
  valueLabel?: ReactNode;
  /** Optional className forwarded to the outer wrapper */
  className?: string;
}

export interface IProgressRingView {
  readonly radius: number;
  readonly circumference: number;
  readonly offset: number;
  readonly display: ReactNode;
}
