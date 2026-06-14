import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@shiroani/shared';
import { cn } from '@/lib/utils';

function PolishFlag() {
  return (
    <svg viewBox="0 0 8 5" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <rect width="8" height="5" fill="#ffffff" />
      <rect y="2.5" width="8" height="2.5" fill="#dc143c" />
    </svg>
  );
}

function UnionJackFlag() {
  return (
    <svg
      viewBox="0 0 60 30"
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      <clipPath id="uj-clip">
        <path d="M30,15 h30 v15 z M30,15 v15 H0 z M30,15 H0 V0 z M30,15 V0 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uj-clip)" stroke="#c8102e" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}

const FLAG_GLYPHS: Record<SupportedLanguage, ReactNode> = {
  pl: <PolishFlag />,
  en: <UnionJackFlag />,
};

interface ILanguageOptionsProps {
  active: SupportedLanguage;
  onSelect: (code: SupportedLanguage) => void | Promise<void>;
}

/** The radiogroup of supported languages (flag + label + active check). */
export function LanguageOptions({ active, onSelect }: ILanguageOptionsProps) {
  const { t } = useTranslation('onboarding');

  return (
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
              void onSelect(lang.code);
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
              className="h-[26px] w-9 flex-shrink-0 overflow-hidden rounded-[4px] ring-1 ring-foreground/10"
            >
              {FLAG_GLYPHS[lang.code]}
            </span>
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
  );
}
