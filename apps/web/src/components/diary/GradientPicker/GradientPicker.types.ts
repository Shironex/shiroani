import type { DiaryGradient } from '@shiroani/shared';

export interface IGradientPickerProps {
  value: DiaryGradient | undefined;
  onChange: (gradient: DiaryGradient | undefined) => void;
  /** When true, stacks the swatches vertically — used in the editor sidebar. */
  stacked?: boolean;
  /** Optional className for the root container. */
  className?: string;
}

export interface IGradientSwatch {
  readonly key: DiaryGradient;
  readonly label: string;
  readonly css: string;
}

export interface IGradientPickerView {
  readonly eyebrow: string;
  readonly clearLabel: string;
  readonly swatches: IGradientSwatch[];
}
