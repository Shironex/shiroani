import { Trans, useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { StepLayout } from '../../StepLayout';
import { useLanguageStep } from './LanguageStep.hooks';
import { LanguageOptions } from './LanguageStep.parts';

/** Step 00 · Interface language. Switches i18next live and persists the choice. */
export default function LanguageStep() {
  const { t } = useTranslation('onboarding');
  const { active, onSelect } = useLanguageStep();
  const emPrimary = <em className="not-italic text-primary italic" />;
  const bStrong = <b className="font-semibold text-foreground" />;
  const bPrimary = <b className="font-bold text-primary" />;

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

      <p className="mt-auto font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.language.footnote')}
      </p>
    </StepLayout>
  );
}
