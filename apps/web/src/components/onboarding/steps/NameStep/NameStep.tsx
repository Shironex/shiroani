import { Trans, useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react';
import { DISPLAY_NAME_MAX_LENGTH } from '@shiroani/shared';
import { Input } from '@/components/ui/input';
import { StepLayout } from '../../StepLayout';
import { useNameStep } from './NameStep.hooks';

/** Step 01 · Display name. Persists to the settings store (local-only). */
export default function NameStep() {
  const { t } = useTranslation('onboarding');
  const { displayName, setDisplayName } = useNameStep();
  const emPrimary = <em className="not-italic text-primary italic" />;
  const bPrimary = <b className="font-bold text-primary" />;

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
        <Input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder={t('step.name.placeholder')}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          aria-label={t('step.name.ariaLabel')}
          className="h-10 text-[14px]"
          autoFocus
        />
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/70">
          <span>{t('step.name.maxChars', { count: DISPLAY_NAME_MAX_LENGTH })}</span>
          <span>
            {displayName.length} / {DISPLAY_NAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      <p className="mt-auto font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.name.footnote')}
      </p>
    </StepLayout>
  );
}
