import type { DiaryMood } from '@shiroani/shared';

export interface IMoodPickerPillsProps {
  value: DiaryMood | undefined;
  onChange: (next: DiaryMood | undefined) => void;
  /**
   * `sm` — sidebar pill with emoji + label (rounded-full, bordered).
   * `xs` — compact toolbar tile with emoji only (fades inactive).
   */
  size: 'sm' | 'xs';
  className?: string;
}

export interface IMoodOption {
  readonly value: DiaryMood;
  readonly label: string;
  readonly emoji: string;
}

export interface IMoodPickerPillsView {
  readonly options: IMoodOption[];
}
