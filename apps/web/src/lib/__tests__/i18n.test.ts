import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, UI_LANGUAGE_SETTING_KEY } from '@shiroani/shared';

// Hoisted mocks so they apply at module-init time.
const mocks = vi.hoisted(() => ({
  isElectron: { value: false },
  electronStoreGet: vi.fn<(key: string) => Promise<unknown>>(),
  electronStoreSet: vi.fn<(key: string, value: unknown) => Promise<void>>(),
}));

vi.mock('@/lib/platform', () => ({
  get IS_ELECTRON() {
    return mocks.isElectron.value;
  },
}));

vi.mock('@/lib/electron-store', () => ({
  electronStoreGet: mocks.electronStoreGet,
  electronStoreSet: mocks.electronStoreSet,
}));

// Loaded after the mocks are in place — i18n.ts reads localStorage at module
// load time, so we import it lazily inside the bootstrap suite.
type I18nModule = typeof import('@/lib/i18n');

async function loadI18n(): Promise<I18nModule> {
  vi.resetModules();
  return await import('@/lib/i18n');
}

describe('lib/i18n', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.isElectron.value = false;
    mocks.electronStoreGet.mockReset();
    mocks.electronStoreSet.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('getInitialLanguage (via i18n.language after init)', () => {
    it('returns the stored localStorage value when supported', async () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pl');
      const { default: i18n } = await loadI18n();
      expect(i18n.language).toBe('pl');
    });

    it('falls back through navigator.language when localStorage is empty', async () => {
      const langSpy = vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('pl-PL');
      try {
        const { default: i18n } = await loadI18n();
        expect(i18n.language).toBe('pl');
      } finally {
        langSpy.mockRestore();
      }
    });

    it('rejects unsupported localStorage values and falls through to default', async () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
      const langSpy = vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('de-DE');
      try {
        const { default: i18n } = await loadI18n();
        expect(i18n.language).toBe(DEFAULT_LANGUAGE);
      } finally {
        langSpy.mockRestore();
      }
    });

    it('uses DEFAULT_LANGUAGE when both localStorage and navigator.language are unsupported', async () => {
      const langSpy = vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fr-FR');
      try {
        const { default: i18n } = await loadI18n();
        expect(i18n.language).toBe(DEFAULT_LANGUAGE);
      } finally {
        langSpy.mockRestore();
      }
    });
  });

  describe('persistLanguage', () => {
    it('writes to localStorage in non-electron context', async () => {
      const { persistLanguage } = await loadI18n();
      persistLanguage('pl');
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pl');
      expect(mocks.electronStoreSet).not.toHaveBeenCalled();
    });

    it('mirrors to electron-store when running in Electron', async () => {
      mocks.isElectron.value = true;
      const { persistLanguage } = await loadI18n();
      persistLanguage('pl');
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pl');
      expect(mocks.electronStoreSet).toHaveBeenCalledWith(UI_LANGUAGE_SETTING_KEY, 'pl');
    });

    it('swallows electron-store mirror failures', async () => {
      mocks.isElectron.value = true;
      mocks.electronStoreSet.mockRejectedValueOnce(new Error('boom'));
      const { persistLanguage } = await loadI18n();
      expect(() => persistLanguage('en')).not.toThrow();
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    });
  });

  describe('hydrateLanguageFromStore', () => {
    it('is a no-op outside Electron', async () => {
      const { hydrateLanguageFromStore } = await loadI18n();
      await hydrateLanguageFromStore();
      expect(mocks.electronStoreGet).not.toHaveBeenCalled();
    });

    it('ignores unsupported stored values', async () => {
      mocks.isElectron.value = true;
      mocks.electronStoreGet.mockResolvedValueOnce('xx');
      const { default: i18n, hydrateLanguageFromStore } = await loadI18n();
      const before = i18n.language;
      await hydrateLanguageFromStore();
      expect(i18n.language).toBe(before);
    });

    it('mirrors stored language to localStorage and switches i18next', async () => {
      mocks.isElectron.value = true;
      mocks.electronStoreGet.mockResolvedValueOnce('pl');
      const { default: i18n, hydrateLanguageFromStore } = await loadI18n();
      await hydrateLanguageFromStore();
      expect(i18n.language).toBe('pl');
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pl');
    });

    it('swallows electron-store read failures', async () => {
      mocks.isElectron.value = true;
      mocks.electronStoreGet.mockRejectedValueOnce(new Error('store down'));
      const { hydrateLanguageFromStore } = await loadI18n();
      await expect(hydrateLanguageFromStore()).resolves.toBeUndefined();
    });
  });

  describe('end-to-end PL render', () => {
    it('resolves a Polish string when language is set to pl', async () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pl');
      const { default: i18n } = await loadI18n();
      // common:actions.save → "Zapisz" in PL, "Save" in EN. Asserting the
      // exact PL string so a regression to EN is caught.
      expect(i18n.t('actions.save', { ns: 'common' })).toBe('Zapisz');
    });

    it('resolves an English string when language is set to en', async () => {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
      const { default: i18n } = await loadI18n();
      expect(i18n.t('actions.save', { ns: 'common' })).toBe('Save');
    });
  });
});
