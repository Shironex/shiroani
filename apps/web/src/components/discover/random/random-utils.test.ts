import { describe, it, expect } from 'vitest';
import { getTitle, stripHtml, buildShowcaseMeta } from './random-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

function makeMedia(overrides: Partial<DiscoverMedia> = {}): DiscoverMedia {
  return {
    id: 1,
    title: { english: 'Cowboy Bebop', romaji: 'Cowboy Bebop', native: 'カウボーイビバップ' },
    coverImage: { large: 'large.jpg', medium: 'med.jpg', extraLarge: 'xl.jpg' },
    ...overrides,
  };
}

describe('getTitle', () => {
  it('prefers english over romaji and native', () => {
    expect(getTitle({ english: 'A', romaji: 'B', native: 'C' })).toBe('A');
  });
  it('falls back to romaji when english is missing', () => {
    expect(getTitle({ romaji: 'B', native: 'C' })).toBe('B');
  });
  it('falls back to native when only native exists', () => {
    expect(getTitle({ native: 'C' })).toBe('C');
  });
  it('returns ? when title object is empty', () => {
    expect(getTitle({})).toBe('?');
  });
});

describe('stripHtml', () => {
  it('returns empty string for undefined', () => {
    expect(stripHtml(undefined)).toBe('');
  });
  it('strips tags', () => {
    expect(stripHtml('<p>hello <b>world</b></p>')).toBe('hello world');
  });
  it('converts <br> to newline', () => {
    expect(stripHtml('line1<br>line2')).toBe('line1\nline2');
  });
  it('collapses 3+ blank lines to a single blank line', () => {
    expect(stripHtml('a\n\n\n\nb')).toBe('a\n\nb');
  });
  it('trims leading/trailing whitespace', () => {
    expect(stripHtml('  <p>x</p>  ')).toBe('x');
  });
});

describe('buildShowcaseMeta', () => {
  it('uses the highest-resolution cover available', () => {
    const meta = buildShowcaseMeta(makeMedia());
    expect(meta.cover).toBe('xl.jpg');
  });
  it('falls back through cover image qualities', () => {
    const meta = buildShowcaseMeta(makeMedia({ coverImage: { medium: 'med.jpg' } }));
    expect(meta.cover).toBe('med.jpg');
  });
  it('uses bannerImage when present, else falls back to cover', () => {
    expect(buildShowcaseMeta(makeMedia({ bannerImage: 'banner.jpg' })).banner).toBe('banner.jpg');
    expect(buildShowcaseMeta(makeMedia()).banner).toBe('xl.jpg');
  });
  it('translates known season + year via the active locale', () => {
    const meta = buildShowcaseMeta(makeMedia({ season: 'SPRING', seasonYear: 2026 }));
    // Tests boot i18n in EN — anilist:season.spring = "Spring".
    expect(meta.yearLabel).toBe('Spring 2026');
  });
  it('falls back to year alone when season is missing', () => {
    const meta = buildShowcaseMeta(makeMedia({ seasonYear: 2024 }));
    expect(meta.yearLabel).toBe('2024');
  });
  it('returns null yearLabel when neither season nor year present', () => {
    expect(buildShowcaseMeta(makeMedia()).yearLabel).toBeNull();
  });
  it('translates known format and status via the active locale', () => {
    const meta = buildShowcaseMeta(makeMedia({ format: 'MOVIE', status: 'FINISHED' }));
    // EN: anilist:format.movie / anilist:status.finished.
    expect(meta.formatLabel).toBe('Movie');
    expect(meta.statusLabel).toBe('Finished');
  });
  it('passes through unknown format/status verbatim', () => {
    const meta = buildShowcaseMeta(makeMedia({ format: 'WEIRD_FORMAT', status: 'WEIRD_STATUS' }));
    expect(meta.formatLabel).toBe('WEIRD_FORMAT');
    expect(meta.statusLabel).toBe('WEIRD_STATUS');
  });
  it('returns null format/status labels when fields are absent', () => {
    const meta = buildShowcaseMeta(makeMedia());
    expect(meta.formatLabel).toBeNull();
    expect(meta.statusLabel).toBeNull();
  });
  it('strips html from description for synopsis', () => {
    const meta = buildShowcaseMeta(makeMedia({ description: '<p>summary</p>' }));
    expect(meta.synopsis).toBe('summary');
  });
});
