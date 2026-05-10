import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import i18n from '@/lib/i18n';

/**
 * Polish CLDR plural buckets:
 *   _one  → 1
 *   _few  → 2-4 (excluding 12-14)
 *   _many → 0, 5-21, teens trap (12-14), 25-31 with last digit 0,5-9, etc.
 *   _other → fractions / fallback
 *
 * We pin a representative key from each plural-aware namespace so a CLDR
 * regression in i18next or a translator-side bucket mistake surfaces here
 * instead of silently shipping wrong grammar to PL users.
 */
describe('Polish plural rules — browser:newTab.quickAccess.tabsCount', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pl');
  });

  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  // tabsCount_one   = "{{count}} zakładka"
  // tabsCount_few   = "{{count}} zakładki"
  // tabsCount_many  = "{{count}} zakładek"
  it.each([
    [1, 'zakładka'],
    [2, 'zakładki'],
    [3, 'zakładki'],
    [4, 'zakładki'],
    [5, 'zakładek'],
    [12, 'zakładek'], // teens trap
    [13, 'zakładek'],
    [14, 'zakładek'],
    [21, 'zakładek'], // last-digit-1 but >20 → many in PL
    [22, 'zakładki'], // last-digit-2 (not 12) → few
    [25, 'zakładek'],
    [0, 'zakładek'],
  ])('count=%i → contains "%s"', (count, expected) => {
    const value = i18n.t('newTab.quickAccess.tabsCount', { ns: 'browser', count });
    expect(value).toContain(expected);
    expect(value).toContain(String(count));
  });
});

describe('English plural rules — browser:newTab.quickAccess.tabsCount', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  // tabsCount_one    = "{{count}} bookmark"
  // tabsCount_other  = "{{count}} bookmarks"
  it.each([
    [1, '1 bookmark'],
    [0, '0 bookmarks'],
    [2, '2 bookmarks'],
    [12, '12 bookmarks'],
    [22, '22 bookmarks'],
  ])('count=%i → "%s"', (count, expected) => {
    expect(i18n.t('newTab.quickAccess.tabsCount', { ns: 'browser', count })).toBe(expected);
  });
});
