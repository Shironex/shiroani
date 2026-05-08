import { Trans, useTranslation } from 'react-i18next';
import { Check, Languages } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { PillTag } from '@/components/ui/pill-tag';

/**
 * Step 01 · Language.
 *
 * Polish is the only locale currently shipped; English is shown as a teaser
 * with a SOON pill. No store wiring — `useSettingsStore.preferredLanguage`
 * controls anime-title language, not the UI locale, so this screen is purely
 * informational at the moment. When a real locale store lands, rewire here.
 */
export function LanguageStep() {
  const { t } = useTranslation('onboarding');
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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Polski — active */}
        <div className="relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-primary/40 bg-primary/10 p-3.5">
          <span
            aria-hidden="true"
            className="h-[26px] w-9 flex-shrink-0 rounded-[4px] border border-border-glass"
            style={{ background: 'linear-gradient(180deg, #fff 50%, #dc143c 50%)' }}
          />
          <div className="min-w-0 flex-1">
            <b className="block text-sm font-semibold text-foreground">
              {t('step.language.polish.name')}
            </b>
            <small className="text-[11.5px] text-muted-foreground">
              {t('step.language.polish.current')}
            </small>
          </div>
          <Check className="h-4 w-4 flex-shrink-0 text-primary" />
        </div>

        {/* English — coming soon */}
        <div
          aria-disabled="true"
          className="relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-border-glass bg-foreground/[0.02] p-3.5 opacity-60"
        >
          <span
            aria-hidden="true"
            className="h-[26px] w-9 flex-shrink-0 rounded-[4px] border border-border-glass"
            style={{
              background: 'linear-gradient(180deg, #012169 33%, #fff 33% 66%, #c8102e 66%)',
            }}
          />
          <div className="min-w-0 flex-1">
            <b className="block text-sm font-semibold text-foreground">
              {t('step.language.english.name')}
            </b>
            <small className="text-[11.5px] text-muted-foreground">
              {t('step.language.english.soon')}
            </small>
          </div>
          <PillTag variant="accent" className="absolute right-2 top-2">
            {t('step.language.english.badge')}
          </PillTag>
        </div>
      </div>

      <p className="mt-auto font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.language.footnote')}
      </p>
    </StepLayout>
  );
}
