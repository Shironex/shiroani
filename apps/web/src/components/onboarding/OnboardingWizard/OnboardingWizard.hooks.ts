import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isEditableTarget } from '@/lib/is-editable-target';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { LanguageStep } from '../steps/LanguageStep';
import { NameStep } from '../steps/NameStep';
import { ThemeStep } from '../steps/ThemeStep';
import { BackgroundStep } from '../steps/BackgroundStep';
import { DockStep } from '../steps/DockStep';
import { DiscordStep } from '../steps/DiscordStep';
import { AniListStep } from '../steps/AniListStep';
import { MalStep } from '../steps/MalStep';
import { AdblockStep } from '../steps/AdblockStep';
import { SummaryStep } from '../steps/SummaryStep';
import type { IOnboardingWizardView, WizardDirection } from './OnboardingWizard.types';

type StepDef = {
  id: string;
  /** i18n key suffix under `wizard.chip.*`. */
  chipKind: 'welcome' | 'step' | 'summary';
  Component: () => ReactNode;
  /** Whether this slot counts as a numbered step (true) or the summary slot (false). */
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

export function useOnboardingWizard(onComplete: () => void): IOnboardingWizardView {
  const { t } = useTranslation('onboarding');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<WizardDirection>('forward');
  const [isExiting, setIsExiting] = useState(false);
  const setCompleted = useOnboardingStore(s => s.setCompleted);

  // Guard against double-completion (Enter double-fire, rapid clicks) and keep
  // the exit timer id so we can clear it if the wizard unmounts mid-exit.
  const isExitingRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOTAL_SLOTS - 1;

  // Chip label: numbered steps render "Step N of TOTAL_NUMBERED" (i18n CLDR
  // plural); welcome reuses the template; summary uses its own key.
  const chipLabel = useMemo(() => {
    const stepNumber = STEPS.slice(0, step + 1).filter(s => s.numbered).length;
    if (current.chipKind === 'summary') {
      return t('wizard.chip.summary', { count: stepNumber, total: TOTAL_NUMBERED });
    }
    return t(`wizard.chip.${current.chipKind}`, { count: stepNumber, total: TOTAL_NUMBERED });
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
    // Re-entry guard: ignore repeat calls once the exit animation has started.
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setCompleted();
      onComplete();
    }, 500);
  }, [setCompleted, onComplete]);

  // Clear the pending exit timer if the wizard unmounts before it fires.
  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      setDirection(index > step ? 'forward' : 'backward');
      setStep(index);
    },
    [step]
  );

  // Keyboard navigation: Enter/→ advances, ← goes back, Esc jumps to summary.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack keys while typing in inputs / textareas.
      if (isEditableTarget(e.target)) return;

      // Skip when the event originates from a focused interactive control — the
      // browser already fires its native activation (e.g. Enter on a Button),
      // so hijacking here would double-fire next()/finish().
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          'button, [role="switch"], [role="radio"], [role="tab"], a, input, textarea, select'
        )
      ) {
        return;
      }

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

  return {
    chipLabel,
    StepComponent: current.Component,
    currentId: current.id,
    direction,
    isExiting,
    isFirst,
    isLast,
    step,
    steps: STEPS,
    onNext: next,
    onPrev: prev,
    onFinish: finish,
    onGoToStep: goToStep,
  };
}
