import { Trans, useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react';
import { DISPLAY_NAME_MAX_LENGTH } from '@shiroani/shared';
import { Input } from '@/components/ui/input';
import { Eyebrow } from '@/components/shared/Eyebrow';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bPrimary } from '../../shared-parts';
import { useNameStep } from './NameStep.hooks';

/** Step 01 · Display name. Persists to the settings store (local-only). */
export default function NameStep() {
  const { t } = useTranslation('onboarding');
  const { displayName, setDisplayName } = useNameStep();

  return (
    <StepLayout
      kanji="名"
      headline={
        <Trans ns="onboarding" i18nKey="step.name.headline" components={{ 1: emPrimary }} />
      }
      description={t('step.name.description')}
      stepMarker={<Trans ns="onboarding" i18nKey="step.name.marker" components={{ 1: bPrimary }} />}
      stepIcon={<UserRound className="h-5 w-5" />}
      stepTitle={t('step.name.title')}
      stepHint={t('step.name.hint')}
    >
      <div className="flex flex-col gap-2">
        <Eyebrow htmlFor="onb-display-name">{t('step.name.ariaLabel')}</Eyebrow>
        <Input
          id="onb-display-name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder={t('step.name.placeholder')}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          className="h-10 text-sm"
          autoFocus
        />
        <div className="flex items-center justify-between font-mono text-2xs uppercase tracking-[0.16em] text-muted-foreground">
          <span>{t('step.name.maxChars', { count: DISPLAY_NAME_MAX_LENGTH })}</span>
          <span>
            {displayName.length} / {DISPLAY_NAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      <p className="mt-auto font-mono text-2xs normal-case text-muted-foreground">
        {t('step.name.footnote')}
      </p>
    </StepLayout>
  );
}
