import { Trans } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bStrong, bPrimary } from '../../shared-parts';
import { useBackgroundStep } from './BackgroundStep.hooks';

/**
 * Step 03 · App background. Wraps the shared BackgroundPanel (preview, file
 * picker, opacity/blur sliders) in the onboarding chrome; the panel itself owns
 * the BackgroundStore wiring (Electron file dialog, persistence, CSS vars).
 */
export default function BackgroundStep() {
  const { stepTitle } = useBackgroundStep();

  return (
    <StepLayout
      kanji="景"
      headline={
        <Trans ns="onboarding" i18nKey="step.background.headline" components={{ 1: emPrimary }} />
      }
      description={
        <Trans ns="onboarding" i18nKey="step.background.description" components={{ 1: bStrong }} />
      }
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.background.marker" components={{ 1: bPrimary }} />
      }
      stepIcon={<Sparkles className="h-5 w-5" />}
      stepTitle={stepTitle}
    >
      <BackgroundPanel variant="onboarding" />
    </StepLayout>
  );
}
