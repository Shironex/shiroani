import { useEffect, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  translations,
  type SupportedLanguage,
} from './i18n';

/**
 * Subscribe a React island to the landing's client-side language swap.
 *
 * The Astro layout owns the source of truth: it reads `localStorage`,
 * walks `[data-i18n]` nodes, and dispatches `shiroani:lang-change` with
 * `detail: { lang }`. React islands hydrate independently and would
 * otherwise hold the SSR-default language forever — this hook re-reads
 * on mount and re-renders whenever the toggle fires.
 */
export function useLandingLang(): SupportedLanguage {
  const [lang, setLang] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isSupportedLanguage(stored)) setLang(stored);
    } catch {
      /* ignore */
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ lang: SupportedLanguage }>).detail;
      if (detail && isSupportedLanguage(detail.lang)) setLang(detail.lang);
    };

    document.addEventListener('shiroani:lang-change', handler);
    return () => document.removeEventListener('shiroani:lang-change', handler);
  }, []);

  return lang;
}

/**
 * Convenience translator paired with {@link useLandingLang}. Returns the
 * dictionary entry for the active language, falling back to the default
 * language and finally to the key itself.
 */
export function useT(): (key: string) => string {
  const lang = useLandingLang();
  return (key: string) => translations[lang]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
}
