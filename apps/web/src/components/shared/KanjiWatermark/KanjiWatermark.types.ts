import type * as React from 'react';

export type KanjiWatermarkPosition = 'br' | 'tr' | 'bl' | 'tl';

/**
 * Large decorative kanji character rendered behind view hero sections in the
 * redesign. Positioned absolutely; pointer-events: none.
 */
export interface IKanjiWatermarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  kanji: string;
  /** Which corner the glyph sits in (default bottom-right) */
  position?: KanjiWatermarkPosition;
  /** Glyph size in px (default 220) */
  size?: number;
  /** Optional opacity override (default .06) */
  opacity?: number;
}

export type IKanjiWatermarkView = Record<string, never>;
