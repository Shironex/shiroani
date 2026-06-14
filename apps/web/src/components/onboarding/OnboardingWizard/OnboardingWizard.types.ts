import type { ReactNode } from 'react';

export interface IOnboardingWizardProps {
  onComplete: () => void;
}

export type WizardDirection = 'forward' | 'backward';

export interface IWizardStep {
  readonly id: string;
}

export interface IOnboardingWizardView {
  readonly chipLabel: string;
  readonly StepComponent: () => ReactNode;
  readonly currentId: string;
  readonly direction: WizardDirection;
  readonly isExiting: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly step: number;
  readonly steps: readonly IWizardStep[];
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly onFinish: () => void;
  readonly onGoToStep: (index: number) => void;
}
