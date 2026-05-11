/**
 * i18n constants shared across the suite (renderer, main process helpers,
 * landing page). Strings themselves live per-surface — only the contract
 * (which languages exist, where they're persisted) is shared here.
 *
 * Mirrors shiranami's pattern (`apps/web/src/lib/i18n.ts`) with the storage
 * key namespaced to ShiroAni.
 */

/**
 * The full set of UI languages the app ships translations for.
 * Order is the canonical display order in pickers.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pl', label: 'Polski' },
] as const;

/**
 * Union of supported language codes (e.g. `'en' | 'pl'`).
 * Derived from {@link SUPPORTED_LANGUAGES} so adding a locale is a single edit.
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * `localStorage` key used by the renderer for the synchronous boot read.
 * Namespaced to avoid collisions with other apps that share an Electron
 * `localStorage` partition during dev.
 */
export const LANGUAGE_STORAGE_KEY = 'shiroani.language';

/**
 * `electron-store` key for the durable, cross-window UI language.
 * The renderer mirrors {@link LANGUAGE_STORAGE_KEY} into this key so new
 * windows boot in the right language even when their `localStorage` is empty.
 *
 * Distinct from `useSettingsStore.preferredLanguage`, which controls anime
 * title display (japanese / english / romaji), not UI chrome.
 */
export const UI_LANGUAGE_SETTING_KEY = 'app.uiLanguage';

/**
 * Language used when nothing is persisted yet (first launch) and as the
 * i18next `fallbackLng` for missing keys.
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Type guard for unknown values read out of `localStorage` / `electron-store`.
 * Use this anywhere a stored value needs to be narrowed before passing to
 * `i18n.changeLanguage`.
 */
export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.some(lang => lang.code === value);
}
