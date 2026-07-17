import type { ReactNode } from 'react';

export interface ISelectableChipButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}

export type ISelectableChipButtonView = Record<string, never>;
