import type { LucideIcon } from 'lucide-react';

export type BackgroundPanelVariant = 'card' | 'onboarding';

export interface IBackgroundPanelProps {
  variant?: BackgroundPanelVariant;
  /** Override the "remove background" icon — e.g. onboarding uses RotateCcw. */
  removeIcon?: LucideIcon;
  /** Override the "remove background" button label. */
  removeLabel?: string;
  className?: string;
}

export interface IBackgroundPanelView {
  readonly customBackground: string | null;
  readonly backgroundOpacity: number;
  readonly backgroundBlur: number;
  readonly backgroundDim: number;
  readonly pickBackground: () => void;
  readonly removeBackground: () => void;
  readonly setBackgroundOpacity: (value: number) => void;
  readonly setBackgroundBlur: (value: number) => void;
  readonly setBackgroundDim: (value: number) => void;
}
