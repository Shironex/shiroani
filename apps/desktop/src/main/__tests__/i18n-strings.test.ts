jest.mock('electron');

const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../logging/logger', () => ({
  createMainLogger: () => loggerMock,
}));

const storeMock = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};
jest.mock('../store', () => ({ store: storeMock }));

import { t, getCurrentLanguage, type MainTranslationKey } from '../i18n-strings';

describe('main process i18n-strings', () => {
  beforeEach(() => {
    storeMock.get.mockReset();
    storeMock.set.mockReset();
    storeMock.delete.mockReset();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
  });

  describe('getCurrentLanguage', () => {
    it('returns the stored language when supported', () => {
      storeMock.get.mockReturnValueOnce('pl');
      expect(getCurrentLanguage()).toBe('pl');
    });

    it('falls back to en when the store returns garbage', () => {
      storeMock.get.mockReturnValueOnce('xx');
      expect(getCurrentLanguage()).toBe('en');
    });

    it('falls back to en when the store returns undefined', () => {
      storeMock.get.mockReturnValueOnce(undefined);
      expect(getCurrentLanguage()).toBe('en');
    });

    it('falls back to en for non-string values', () => {
      storeMock.get.mockReturnValueOnce(42);
      expect(getCurrentLanguage()).toBe('en');
    });
  });

  describe('t() — happy path', () => {
    it('resolves an English string when language is en', () => {
      storeMock.get.mockReturnValue('en');
      expect(t('tray.show')).toBe('Show ShiroAni');
    });

    it('resolves a Polish string when language is pl', () => {
      storeMock.get.mockReturnValue('pl');
      expect(t('tray.show')).toBe('Pokaż ShiroAni');
    });

    it('resolves a deeply nested key', () => {
      storeMock.get.mockReturnValue('en');
      expect(t('discord.template.idle.details')).toBe('Idle');
      storeMock.get.mockReturnValue('pl');
      expect(t('discord.template.idle.details')).toBe('Oczekiwanie');
    });
  });

  describe('t() — interpolation', () => {
    it('substitutes {{name}} placeholders with provided params', () => {
      storeMock.get.mockReturnValue('en');
      expect(t('notification.bodyAiringNow', { episode: 5 })).toBe('Episode 5 airing now!');
    });

    it('coerces numeric params to strings', () => {
      storeMock.get.mockReturnValue('pl');
      expect(t('notification.bodyInFuture', { episode: 12, minutes: 7 })).toBe(
        'Odcinek 12 za 7 min'
      );
    });

    it('renders missing params as empty strings without leaking the placeholder', () => {
      storeMock.get.mockReturnValue('en');
      // bodyAiredAgo expects {{episode}} and {{minutes}}; supply only one.
      expect(t('notification.bodyAiredAgo', { episode: 3 })).toBe('Episode 3 — aired  min ago');
    });

    it('returns the resolved value untouched when no params are supplied', () => {
      storeMock.get.mockReturnValue('en');
      expect(t('discord.activityLabel.library')).toBe('Library');
    });
  });

  describe('t() — fallback behavior', () => {
    it('returns the raw key and warns when the key is missing in every locale', () => {
      storeMock.get.mockReturnValue('en');
      const result = t('tray.bogus' as MainTranslationKey);
      expect(result).toBe('tray.bogus');
      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing main-process translation key')
      );
    });

    it('treats an unsupported store value as en and resolves correctly', () => {
      storeMock.get.mockReturnValue('xx');
      expect(t('tray.show')).toBe('Show ShiroAni');
    });
  });
});
