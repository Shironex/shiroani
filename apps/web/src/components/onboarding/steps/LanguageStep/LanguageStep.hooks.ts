import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '@shiroani/shared';
import { persistLanguage } from '@/lib/i18n';
import type { ILanguageStepView } from './LanguageStep.types';

export function useLanguageStep(): ILanguageStepView {
  const { i18n } = useTranslation('onboarding');
  const active = i18n.language as SupportedLanguage;

  const onSelect = useCallback(
    async (code: SupportedLanguage) => {
      if (code === i18n.language) return;
      await i18n.changeLanguage(code);
      persistLanguage(code);
    },
    [i18n]
  );

  return { active, onSelect };
}
