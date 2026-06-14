import type { SupportedLanguage } from '@shiroani/shared';

export interface ILanguageStepView {
  readonly active: SupportedLanguage;
  readonly onSelect: (code: SupportedLanguage) => Promise<void>;
}
