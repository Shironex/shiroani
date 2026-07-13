import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { IWizardStep } from './OnboardingWizard.types';

interface IProgressDotsProps {
  steps: readonly IWizardStep[];
  step: number;
  onGoToStep: (index: number) => void;
}

/** Clickable progress dots for the wizard footer (one per step slot). */
export function ProgressDots({ steps, step, onGoToStep }: IProgressDotsProps) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('wizard.progressAria')}>
      {steps.map((s, i) => {
        const state = i === step ? 'on' : i < step ? 'done' : 'pending';
        return (
          <button
            key={s.id}
            aria-label={t('wizard.stepDotAria', { number: i + 1, id: s.id })}
            aria-current={state === 'on' ? 'step' : undefined}
            onClick={() => onGoToStep(i)}
            className="group rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span
              className={cn(
                'block h-2 rounded-full transition-[width,background-color] duration-300',
                state === 'on' && 'w-8 bg-primary',
                state === 'done' && 'w-2 bg-primary/50',
                state === 'pending' && 'w-2 bg-foreground/15 group-hover:bg-foreground/30'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
