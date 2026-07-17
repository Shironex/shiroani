import type { MouseEvent } from 'react';
import type { AiringAnime } from '@shiroani/shared';

export interface ISubscribeBellButtonProps {
  anime: AiringAnime;
  /** Extra classes for the button wrapper (sizing, positioning, backdrop, etc.) */
  className?: string;
  /** Icon size classes — defaults to "w-3.5 h-3.5" */
  iconClassName?: string;
  /** Tooltip placement — defaults to "top" */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  /** Skip the hover/focus reveal and keep the bell fully visible at all times. */
  alwaysVisible?: boolean;
  /** Render a plain button without the tooltip wrapper (avoids tooltip auto-show). */
  noTooltip?: boolean;
}

export interface ISubscribeBellButtonView {
  readonly isSubscribed: boolean;
  readonly toggle: (e: MouseEvent) => void;
  readonly mediaId: number;
}
