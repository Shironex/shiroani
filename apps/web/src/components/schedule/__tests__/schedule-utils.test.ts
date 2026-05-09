import { describe, it, expect } from 'vitest';
import { formatTime, formatDate, addDays, isToday } from '../schedule-utils';
import { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';
import type { AiringAnime } from '@shiroani/shared';

describe('formatTime', () => {
  it('formats a unix timestamp to HH:MM', () => {
    // Output is locale-dependent — `formatTime` reads `i18n.language`,
    // which is EN under the test setup. EN renders 12h ("01:00 AM"); PL
    // would render 24h ("01:00"). Assert the format shape, not the locale.
    const result = formatTime(1704067200); // 2024-01-01 00:00 UTC
    expect(result).toMatch(/^\d{1,2}:\d{2}(\s?(AM|PM))?$/i);
  });

  it('returns a string for any valid timestamp', () => {
    expect(typeof formatTime(0)).toBe('string');
    expect(typeof formatTime(1700000000)).toBe('string');
  });
});

describe('formatDate', () => {
  it('returns a human-readable date string', () => {
    const result = formatDate('2024-01-15');
    // `formatDate` now follows `i18n.language` (EN under the test setup
    // → "January 15, 2024"). Assert the numeric components only so the
    // test stays locale-tolerant.
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('handles different date strings', () => {
    const result = formatDate('2024-12-31');
    expect(result).toContain('31');
    expect(result).toContain('2024');
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2024-01-01', 5)).toBe('2024-01-06');
  });

  it('subtracts with negative days', () => {
    expect(addDays('2024-01-10', -3)).toBe('2024-01-07');
  });

  it('crosses month boundaries', () => {
    expect(addDays('2024-01-30', 3)).toBe('2024-02-02');
  });

  it('crosses year boundaries', () => {
    expect(addDays('2024-12-30', 5)).toBe('2025-01-04');
  });

  it('returns the same date when adding 0', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15');
  });
});

describe('isToday', () => {
  it('returns true for today formatted as YYYY-MM-DD', () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    expect(isToday(`${y}-${m}-${d}`)).toBe(true);
  });

  it('returns false for a different date', () => {
    expect(isToday('2000-01-01')).toBe(false);
  });
});

describe('getAnimeTitle', () => {
  function makeMedia(title: Partial<AiringAnime['media']['title']>): AiringAnime['media'] {
    return {
      id: 1,
      title: { romaji: undefined, english: undefined, native: undefined, ...title },
      coverImage: {},
      status: 'RELEASING',
      genres: [],
    } as unknown as AiringAnime['media'];
  }

  it('prefers romaji', () => {
    expect(
      getAnimeTitle(makeMedia({ romaji: 'Romaji', english: 'English', native: 'Native' }))
    ).toBe('Romaji');
  });

  it('falls back to english when romaji is absent', () => {
    expect(getAnimeTitle(makeMedia({ english: 'English', native: 'Native' }))).toBe('English');
  });

  it('falls back to native', () => {
    expect(getAnimeTitle(makeMedia({ native: 'Native' }))).toBe('Native');
  });

  it('returns "?" when all titles are absent', () => {
    expect(getAnimeTitle(makeMedia({}))).toBe('?');
  });
});

describe('getCoverUrl', () => {
  function makeMedia(
    coverImage: Partial<AiringAnime['media']['coverImage']>
  ): AiringAnime['media'] {
    return {
      id: 1,
      title: {},
      coverImage: { medium: undefined, large: undefined, ...coverImage },
      status: 'RELEASING',
      genres: [],
    } as unknown as AiringAnime['media'];
  }

  it('prefers medium over large', () => {
    expect(getCoverUrl(makeMedia({ medium: 'med.jpg', large: 'lg.jpg' }))).toBe('med.jpg');
  });

  it('returns large when medium is absent', () => {
    expect(getCoverUrl(makeMedia({ large: 'lg.jpg' }))).toBe('lg.jpg');
  });

  it('returns only medium when large is absent', () => {
    expect(getCoverUrl(makeMedia({ medium: 'med.jpg' }))).toBe('med.jpg');
  });

  it('returns undefined when neither is present', () => {
    expect(getCoverUrl(makeMedia({}))).toBeUndefined();
  });
});
