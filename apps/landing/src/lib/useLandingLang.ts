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
 *
 * Pass `initialLang` (the page's SSR `<html lang>`) so the island's
 * server-rendered HTML matches the route's language instead of defaulting
 * to {@link DEFAULT_LANGUAGE}; on the client the stored preference and the
 * `shiroani:lang-change` event still take over.
 */
export function useLandingLang(
  initialLang: SupportedLanguage = DEFAULT_LANGUAGE
): SupportedLanguage {
  const [lang, setLang] = useState<SupportedLanguage>(initialLang);

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
 * language and finally to the key itself. Pass `initialLang` (the page's
 * SSR `<html lang>`) so the island renders the right language on the server.
 */
export function useT(initialLang?: SupportedLanguage): (key: string) => string {
  const lang = useLandingLang(initialLang);
  return (key: string) => translations[lang]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
}
