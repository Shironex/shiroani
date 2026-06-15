import type { ReactNode } from 'react';

export interface IPreviewStageProps {
  children: ReactNode;
  /**
   * Optional uppercase caption rendered above the stage (e.g. "PODGLĄD").
   * Mirrors shiranami's labeled-preview convention so users learn a stage
   * reflects their setting live.
   */
  label?: ReactNode;
  /**
   * Stage height in px (default 144). Ignored when `heightClassName` is set so
   * callers that prefer a Tailwind height utility (e.g. `h-[220px]`) can opt in.
   */
  height?: number;
  /** Tailwind height class — takes precedence over `height` when provided. */
  heightClassName?: string;
  /**
   * Border treatment. `full` (default) is the standard rounded glass border;
   * `bottom` draws only a bottom divider — used when the stage is the header of
   * a larger card (the AniList error state).
   */
  border?: 'full' | 'bottom';
  /** Override the radial glow layer (color + position). */
  glow?: string;
  className?: string;
  'data-testid'?: string;
}

export type IPreviewStageView = Record<string, never>;
