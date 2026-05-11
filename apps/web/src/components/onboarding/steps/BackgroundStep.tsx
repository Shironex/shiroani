import { Trans, useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';

/**
 * Step 03 · App background.
 *
 * Wraps the shared BackgroundPanel in the onboarding chrome. The panel itself
 * handles the preview, file picker and opacity/blur sliders; it wires into the
 * BackgroundStore which manages the Electron file dialog, disk persistence and
 * applying CSS custom properties to the document.
 */
export function BackgroundStep() {
  const { t } = useTranslation('onboarding');
  const emPrimary = <em className="not-italic text-primary italic" />;
  const bStrong = <b className="font-semibold text-foreground" />;
  const bPrimary = <b className="font-bold text-primary" />;

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
      stepTitle={t('step.background.title')}
    >
      <BackgroundPanel variant="onboarding" />
    </StepLayout>
  );
}
