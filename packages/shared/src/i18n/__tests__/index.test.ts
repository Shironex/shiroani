import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  UI_LANGUAGE_SETTING_KEY,
  isSupportedLanguage,
} from '../index';

describe('isSupportedLanguage', () => {
  it('accepts the canonical en code', () => {
    expect(isSupportedLanguage('en')).toBe(true);
  });

  it('accepts the canonical pl code', () => {
    expect(isSupportedLanguage('pl')).toBe(true);
  });

  it('rejects uppercase variants (case-sensitive contract)', () => {
    expect(isSupportedLanguage('PL')).toBe(false);
    expect(isSupportedLanguage('EN')).toBe(false);
  });

  it('rejects BCP 47 region tags (caller is responsible for stripping)', () => {
    // The function compares strict equality against the canonical codes,
    // so callers receiving navigator.language must split-and-lowercase
    // before passing in. See apps/web/src/lib/i18n.ts for the wrapper.
    expect(isSupportedLanguage('pl-PL')).toBe(false);
    expect(isSupportedLanguage('en-US')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isSupportedLanguage('')).toBe(false);
  });

  it('rejects null', () => {
    expect(isSupportedLanguage(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isSupportedLanguage(undefined)).toBe(false);
  });

  it('rejects unsupported languages', () => {
    expect(isSupportedLanguage('es')).toBe(false);
    expect(isSupportedLanguage('de')).toBe(false);
    expect(isSupportedLanguage('ja')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isSupportedLanguage(42)).toBe(false);
    expect(isSupportedLanguage({ code: 'pl' })).toBe(false);
    expect(isSupportedLanguage(['pl'])).toBe(false);
    expect(isSupportedLanguage(true)).toBe(false);
  });
});

describe('i18n contract constants', () => {
  it('exposes en and pl as the supported languages', () => {
    expect(SUPPORTED_LANGUAGES.map(l => l.code)).toEqual(['en', 'pl']);
  });

  it('declares the renderer localStorage key', () => {
    expect(LANGUAGE_STORAGE_KEY).toBe('shiroani.language');
  });

  it('declares the electron-store mirror key', () => {
    expect(UI_LANGUAGE_SETTING_KEY).toBe('app.uiLanguage');
  });

  it('uses en as the default first-launch language', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });
});
