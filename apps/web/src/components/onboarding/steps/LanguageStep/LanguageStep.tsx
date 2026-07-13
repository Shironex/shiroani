import { Trans, useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bStrong, bPrimary } from '../../shared-parts';
import { useLanguageStep } from './LanguageStep.hooks';
import { LanguageOptions } from './LanguageStep.parts';

/** Step 00 · Interface language. Switches i18next live and persists the choice. */
export default function LanguageStep() {
  const { t } = useTranslation('onboarding');
  const { active, onSelect } = useLanguageStep();

  return (
    <StepLayout
      kanji="始"
      headline={
        <Trans ns="onboarding" i18nKey="step.language.headline" components={{ 1: emPrimary }} />
      }
      description={
        <Trans ns="onboarding" i18nKey="step.language.description" components={{ 1: bStrong }} />
      }
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.language.marker" components={{ 1: bPrimary }} />
      }
      stepIcon={<Languages className="h-5 w-5" />}
      stepTitle={t('step.language.title')}
      stepHint={t('step.language.hint')}
    >
      <LanguageOptions active={active} onSelect={onSelect} />

      <p className="mt-auto font-mono text-2xs normal-case text-muted-foreground">
        {t('step.language.footnote')}
      </p>
    </StepLayout>
  );
}
