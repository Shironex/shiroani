import { ArrowRight, ArrowLeft, PartyPopper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import { TitleBar } from '@/components/shared/TitleBar';
import { useOnboardingWizard } from './OnboardingWizard.hooks';
import { ProgressDots } from './OnboardingWizard.parts';
import type { IOnboardingWizardProps } from './OnboardingWizard.types';

/**
 * First-run setup wizard — a full-window modal that walks the user through the
 * onboarding steps (language → … → summary) with animated transitions, keyboard
 * navigation, and clickable progress dots. Marks onboarding complete on finish.
 */
export default function OnboardingWizard({ onComplete }: IOnboardingWizardProps) {
  const { t } = useTranslation('onboarding');
  const {
    chipLabel,
    StepComponent,
    currentId,
    direction,
    isExiting,
    isFirst,
    isLast,
    step,
    steps,
    onNext,
    onPrev,
    onFinish,
    onGoToStep,
  } = useOnboardingWizard(onComplete);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9998] flex flex-col overflow-hidden bg-background text-foreground',
        'transition-[opacity,transform] duration-500 ease-out',
        isExiting && 'scale-[1.03] opacity-0',
        IS_ELECTRON && 'rounded-t-[10px]'
      )}
      role="dialog"
      aria-modal="true"
      aria-label={t('wizard.ariaLabel')}
    >
      {/* Real window chrome — native traffic lights on macOS, drag handle elsewhere */}
      {IS_ELECTRON && <TitleBar />}

      {/* Ambient glow — same vibe as AppBackground but bigger for the hero moment */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[18%] top-[12%] h-80 w-80 rounded-full bg-primary/15 blur-3xl animate-blob-drift-1" />
        <div className="absolute right-[20%] bottom-[8%] h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-blob-drift-2" />
      </div>

      {/* Content — fills the entire window below the titlebar */}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {/* Chip banner (magazine deck) */}
        <div
          key={`${currentId}-chip`}
          className={cn(
            'flex items-center gap-2 px-10 pt-6 pb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground md:px-16',
            direction === 'forward'
              ? 'animate-[onb-slide-in-right_0.35s_ease-out_both]'
              : 'animate-[onb-slide-in-left_0.35s_ease-out_both]'
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>{chipLabel}</span>
        </div>

        {/* Step body — block wrapper so StepLayout's grid fills the viewport width */}
        <div
          key={currentId}
          className={cn(
            'min-h-0 flex-1 overflow-hidden',
            direction === 'forward'
              ? 'animate-[onb-slide-in-right_0.35s_ease-out_both]'
              : 'animate-[onb-slide-in-left_0.35s_ease-out_both]'
          )}
        >
          <StepComponent />
        </div>

        {/* Nav footer — full-bleed bottom bar */}
        <div className="no-drag flex items-center justify-between gap-4 border-t border-border-glass bg-background/60 px-8 py-4 md:px-16">
          <div className="flex items-center gap-3">
            {isFirst ? (
              <button
                onClick={onFinish}
                className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('wizard.skip')}
              </button>
            ) : (
              <Button variant="outline" size="sm" onClick={onPrev} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('wizard.back')}
              </Button>
            )}
          </div>

          <ProgressDots steps={steps} step={step} onGoToStep={onGoToStep} />

          {isLast ? (
            <Button size="sm" onClick={onFinish} className="gap-1.5">
              <PartyPopper className="h-3.5 w-3.5" />
              {t('wizard.finish')}
            </Button>
          ) : (
            <Button size="sm" onClick={onNext} className="gap-1.5">
              {t('wizard.next')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
