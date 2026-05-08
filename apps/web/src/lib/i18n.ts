/**
 * i18next bootstrap for the renderer.
 *
 * Ported from shiranami's `apps/web/src/lib/i18n.ts`. Two intentional
 * differences from shiranami:
 *
 * 1. Locale codes, storage keys, and the type live in `@shiroani/shared`
 *    (`packages/shared/src/i18n/`) so the main process, preload, and
 *    landing site can agree on the contract without each surface
 *    rebuilding its own allow-list.
 * 2. Persistence to `electron-store` goes through the existing
 *    `electronStoreGet` / `electronStoreSet` helpers instead of touching
 *    `window.electronAPI.store` directly.
 *
 * Resources are intentionally empty for now — this commit ships the boot
 * plumbing only. Per-namespace JSON files are added in step 3 of the
 * rollout (see `docs/chain/2026-05-08-i18n-rollout.md`).
 *
 * IMPORTANT: this module is side-effect imported from `main.tsx` BEFORE
 * `createRoot`, so `i18next.init()` runs synchronously before any React
 * subtree mounts. Adding any await before `init()` here will reintroduce
 * the first-paint flash documented in the arch doc's init-timing note.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  UI_LANGUAGE_SETTING_KEY,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@shiroani/shared';
import { IS_ELECTRON } from '@/lib/platform';
import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';

import commonEn from '@/locales/en/common.json';
import statusEn from '@/locales/en/status.json';
import anilistEn from '@/locales/en/anilist.json';

import commonPl from '@/locales/pl/common.json';
import statusPl from '@/locales/pl/status.json';
import anilistPl from '@/locales/pl/anilist.json';

const namespaces = ['common', 'status', 'anilist'] as const;

/**
 * Read the language i18next should boot with. Synchronous on purpose:
 * this runs before React mounts and must not block on IPC.
 *
 * Order:
 *   1. `localStorage[LANGUAGE_STORAGE_KEY]` if it parses to a supported code.
 *   2. {@link DEFAULT_LANGUAGE}.
 *
 * The `electron-store` value is reconciled later via
 * {@link hydrateLanguageFromStore} once the React tree mounts.
 */
function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

/**
 * Persist the user's language choice to both stores:
 *   - `localStorage` (synchronous, survives renderer reload, no IPC).
 *   - `electron-store` (durable, visible to other windows on next mount).
 *
 * The IPC write is fire-and-forget: a failed mirror just means the next
 * `hydrateLanguageFromStore` call will see the stale value and reconcile.
 */
export function persistLanguage(lang: SupportedLanguage) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

  if (IS_ELECTRON) {
    electronStoreSet(UI_LANGUAGE_SETTING_KEY, lang).catch(() => {
      // Mirror failure is non-fatal — localStorage is still authoritative
      // for this window, and hydrate-on-boot will reconcile other windows.
    });
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: commonEn,
      status: statusEn,
      anilist: anilistEn,
    },
    pl: {
      common: commonPl,
      status: statusPl,
      anilist: anilistPl,
    },
  },
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  ns: namespaces as unknown as string[],
  defaultNS: 'common',
  interpolation: {
    // React already escapes; double-escaping mangles diacritics in PL.
    escapeValue: false,
  },
});

/**
 * Reconcile the renderer's i18next language with the durable
 * `electron-store` value. Runs after mount because it's async.
 *
 * If the stored value differs from the synchronous `localStorage` seed
 * (e.g. another window changed the language since this window last
 * booted), we update both `localStorage` and i18next so subsequent
 * reloads stay consistent.
 *
 * Failures are swallowed — a missing or unreadable store just means we
 * keep the seed value, which is the correct fallback.
 */
export async function hydrateLanguageFromStore() {
  if (!IS_ELECTRON) return;
  try {
    const stored = await electronStoreGet<unknown>(UI_LANGUAGE_SETTING_KEY);
    if (isSupportedLanguage(stored)) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, stored);
      if (i18n.language !== stored) {
        await i18n.changeLanguage(stored);
      }
    }
  } catch {
    // Ignore store read failures — see function docstring.
  }
}

export default i18n;
