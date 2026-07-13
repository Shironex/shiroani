import type { HTMLAttributes } from 'react';

export interface IEyebrowProps extends HTMLAttributes<HTMLElement> {
  /**
   * When provided, renders a `<label htmlFor>` bound to a field id; otherwise
   * renders a non-interactive `<span>`.
   */
  htmlFor?: string;
}

export type IEyebrowView = Record<string, never>;
