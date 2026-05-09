import { Trans, useTranslation } from 'react-i18next';
import { Check, Languages } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@shiroani/shared';
import { persistLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const FLAG_BACKGROUNDS: Record<SupportedLanguage, string> = {
  pl: 'linear-gradient(180deg, #fff 50%, #dc143c 50%)',
  en: 'linear-gradient(180deg, #012169 33%, #fff 33% 66%, #c8102e 66%)',
};

export function LanguageStep() {
  const { t, i18n } = useTranslation('onboarding');
  const active = i18n.language as SupportedLanguage;

  async function handleSelect(code: SupportedLanguage) {
    if (code === i18n.language) return;
    await i18n.changeLanguage(code);
    persistLanguage(code);
  }

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
      <div
        role="radiogroup"
        aria-label={t('step.language.groupAria')}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        {SUPPORTED_LANGUAGES.map(lang => {
          const isActive = active === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => {
                void handleSelect(lang.code);
              }}
              className={cn(
                'relative flex items-center gap-3.5 overflow-hidden rounded-xl border p-3.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                isActive
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border-glass bg-foreground/[0.02] hover:bg-foreground/[0.04]'
              )}
            >
              <span
                aria-hidden="true"
                className="h-[26px] w-9 flex-shrink-0 rounded-[4px] border border-border-glass"
                style={{ background: FLAG_BACKGROUNDS[lang.code] }}
              />
              <div className="min-w-0 flex-1">
                <b className="block text-sm font-semibold text-foreground">{lang.label}</b>
                <small className="text-[11.5px] text-muted-foreground">
                  {t(`step.language.${lang.code}.description`)}
                </small>
              </div>
              {isActive && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      <p className="mt-auto font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.language.footnote')}
      </p>
    </StepLayout>
  );
}
