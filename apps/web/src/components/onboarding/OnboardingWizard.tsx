import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON } from '@/lib/platform';
import { isEditableTarget } from '@/lib/is-editable-target';
import { Button } from '@/components/ui/button';
import { TitleBar } from '@/components/shared/TitleBar';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

import { LanguageStep } from './steps/LanguageStep';
import { NameStep } from './steps/NameStep';
import { ThemeStep } from './steps/ThemeStep';
import { BackgroundStep } from './steps/BackgroundStep';
import { DockStep } from './steps/DockStep';
import { DiscordStep } from './steps/DiscordStep';
import { AniListStep } from './steps/AniListStep';
import { MalStep } from './steps/MalStep';
import { AdblockStep } from './steps/AdblockStep';
import { SummaryStep } from './steps/SummaryStep';

interface OnboardingWizardProps {
  onComplete: () => void;
}

type StepDef = {
  id: string;
  /** i18n key suffix under `wizard.chip.*` — `welcome` for the welcome step, `step` for numbered, `summary` for the closer. */
  chipKind: 'welcome' | 'step' | 'summary';
  /** Step component */
  Component: () => ReactNode;
  /** Whether this slot counts as a numbered step (true) or a summary slot (false) */
  numbered: boolean;
};

const STEPS: StepDef[] = [
  { id: 'language', chipKind: 'welcome', Component: LanguageStep, numbered: true },
  { id: 'name', chipKind: 'step', Component: NameStep, numbered: true },
  { id: 'theme', chipKind: 'step', Component: ThemeStep, numbered: true },
  { id: 'background', chipKind: 'step', Component: BackgroundStep, numbered: true },
  { id: 'dock', chipKind: 'step', Component: DockStep, numbered: true },
  { id: 'discord', chipKind: 'step', Component: DiscordStep, numbered: true },
  { id: 'anilist', chipKind: 'step', Component: AniListStep, numbered: true },
  { id: 'mal', chipKind: 'step', Component: MalStep, numbered: true },
  { id: 'adblock', chipKind: 'step', Component: AdblockStep, numbered: true },
  { id: 'summary', chipKind: 'summary', Component: SummaryStep, numbered: false },
];

const TOTAL_SLOTS = STEPS.length;
// Numbered step count (excludes the summary slot) — used in chip labels.
const TOTAL_NUMBERED = STEPS.filter(s => s.numbered).length;

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation('onboarding');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isExiting, setIsExiting] = useState(false);
  const setCompleted = useOnboardingStore(s => s.setCompleted);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOTAL_SLOTS - 1;

  // Chip label: numbered steps render "Step N of TOTAL_NUMBERED" (i18n CLDR plural),
  // welcome reuses the same template with the welcome prefix, summary uses its own key.
  const chipLabel = useMemo(() => {
    const stepNumber = STEPS.slice(0, step + 1).filter(s => s.numbered).length;
    if (current.chipKind === 'summary') {
      return t('wizard.chip.summary', { count: stepNumber, total: TOTAL_NUMBERED });
    }
    return t(`wizard.chip.${current.chipKind}`, {
      count: stepNumber,
      total: TOTAL_NUMBERED,
    });
  }, [step, current.chipKind, t]);

  const next = useCallback(() => {
    if (step < TOTAL_SLOTS - 1) {
      setDirection('forward');
      setStep(s => s + 1);
    }
  }, [step]);

  const prev = useCallback(() => {
    if (step > 0) {
      setDirection('backward');
      setStep(s => s - 1);
    }
  }, [step]);

  const finish = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setCompleted();
      onComplete();
    }, 500);
  }, [setCompleted, onComplete]);

  // Keyboard navigation: Enter/→ advances, ← goes back, Esc jumps to summary.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack keys while typing in inputs / textareas.
      if (isEditableTarget(e.target)) return;

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLast) finish();
        else next();
      } else if (e.key === 'ArrowLeft') {
        prev();
      } else if (e.key === 'Escape') {
        setDirection('forward');
        setStep(TOTAL_SLOTS - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, finish, isLast]);

  const StepComponent = current.Component;

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
          key={`${current.id}-chip`}
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
          key={current.id}
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
                onClick={finish}
                className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('wizard.skip')}
              </button>
            ) : (
              <Button variant="outline" size="sm" onClick={prev} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('wizard.back')}
              </Button>
            )}
          </div>

          {/* Progress dots */}
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label={t('wizard.progressAria')}
          >
            {STEPS.map((s, i) => {
              const state = i === step ? 'on' : i < step ? 'done' : 'pending';
              return (
                <button
                  key={s.id}
                  aria-label={t('wizard.stepDotAria', { number: i + 1, id: s.id })}
                  aria-current={state === 'on' ? 'step' : undefined}
                  onClick={() => {
                    setDirection(i > step ? 'forward' : 'backward');
                    setStep(i);
                  }}
                  className="group p-1.5"
                >
                  <span
                    className={cn(
                      'block h-2 rounded-full transition-all duration-300',
                      state === 'on' && 'w-8 bg-primary',
                      state === 'done' && 'w-2 bg-primary/50',
                      state === 'pending' && 'w-2 bg-foreground/15'
                    )}
                  />
                </button>
              );
            })}
          </div>

          {isLast ? (
            <Button size="sm" onClick={finish} className="gap-1.5">
              <PartyPopper className="h-3.5 w-3.5" />
              {t('wizard.finish')}
            </Button>
          ) : (
            <Button size="sm" onClick={next} className="gap-1.5">
              {t('wizard.next')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
