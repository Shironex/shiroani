import type { KeyboardEvent } from 'react';
import type { DockEdge } from '@/stores/useDockStore';

export interface IDockEdgePickerProps {
  value: DockEdge;
  onSelect: (edge: DockEdge) => void;
  /** Resolves the visible label for an edge (each surface owns its i18n keys). */
  getLabel: (edge: DockEdge) => string;
  /** Accessible label for the radiogroup. */
  ariaLabel: string;
  /**
   * `text` — compact text-only radio buttons (Settings · Dock).
   * `illustrated` — pills with a mini edge-position glyph (onboarding).
   */
  variant?: 'text' | 'illustrated';
  className?: string;
}

export interface IDockEdgePickerView {
  readonly registerRadio: (index: number) => (el: HTMLButtonElement | null) => void;
  readonly handleKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}
