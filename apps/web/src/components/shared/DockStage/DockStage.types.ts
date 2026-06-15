import type { ReactNode } from 'react';
import type { DockEdge } from '@/stores/useDockStore';

export type DockStageItem = {
  id: string;
  /** Optional icon node rendered inside the mini-dock slot. Falls back to a small square. */
  icon?: ReactNode;
  /** When true, the slot is drawn as the active/highlighted dot. */
  highlighted?: boolean;
};

export interface IDockStageProps {
  edge: DockEdge;
  /** Override the stage height in px (default 144). */
  height?: number;
  className?: string;
  /**
   * Explicit list of slots to render in the mini-dock. When omitted the stage
   * falls back to a 4-dot placeholder (used by the Dock position preview).
   */
  items?: DockStageItem[];
  /**
   * Optional uppercase caption rendered above the stage (e.g. "Podgląd"). Used
   * by the settings sections; the onboarding step leaves it unset.
   */
  label?: ReactNode;
}

export type IDockStageView = Record<string, never>;
