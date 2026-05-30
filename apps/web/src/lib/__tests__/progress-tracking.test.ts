import { describe, it, expect } from 'vitest';
import type { AnimeEntry } from '@shiroani/shared';
import { normalizeTitle, matchEntry, computeAdvance } from '../progress-tracking';

function makeEntry(overrides: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id: 1,
    title: 'Attack on Titan',
    status: 'watching',
    currentEpisode: 3,
    episodes: 25,
    addedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeTitle', () => {
  it('lowercases and collapses punctuation/whitespace', () => {
    expect(normalizeTitle('Attack On Titan')).toBe('attack on titan');
    expect(normalizeTitle('attack-on-titan')).toBe('attack on titan');
    expect(normalizeTitle('  Attack   on Titan!! ')).toBe('attack on titan');
  });

  it('strips diacritics', () => {
    expect(normalizeTitle('Frieren — Beyond')).toBe(normalizeTitle('Frieren  Beyond'));
    expect(normalizeTitle('Pokémon')).toBe('pokemon');
  });
});

describe('matchEntry', () => {
  const entries = [
    makeEntry({ id: 1, title: 'Attack on Titan', anilistId: 16498 }),
    makeEntry({ id: 2, title: 'One Piece', titleRomaji: 'Wan Pisu' }),
  ];

  it('matches by anilistId first when present', () => {
    const m = matchEntry(entries, { animeTitle: 'totally different', anilistId: 16498 });
    expect(m?.id).toBe(1);
  });

  it('falls back to normalized title match', () => {
    const m = matchEntry(entries, { animeTitle: 'attack-on-titan' });
    expect(m?.id).toBe(1);
  });

  it('matches against romaji title', () => {
    const m = matchEntry(entries, { animeTitle: 'Wan Pisu' });
    expect(m?.id).toBe(2);
  });

  it('does not throw when title fields are null at runtime', () => {
    // AniList-sourced entries may carry `null` for optional titles despite the
    // `?: string` type; the guard must not call normalizeTitle on them.
    const nullish = [
      makeEntry({
        id: 3,
        title: 'Bleach',
        titleRomaji: null as unknown as string,
        titleNative: null as unknown as string,
      }),
    ];
    expect(() => matchEntry(nullish, { animeTitle: 'Something Else' })).not.toThrow();
    expect(matchEntry(nullish, { animeTitle: 'Something Else' })).toBeNull();
    // Real `title` still matches.
    expect(matchEntry(nullish, { animeTitle: 'bleach' })?.id).toBe(3);
  });

  it('returns null when no confident match exists', () => {
    expect(matchEntry(entries, { animeTitle: 'Naruto' })).toBeNull();
  });

  it('returns null for an empty title with no id', () => {
    expect(matchEntry(entries, { animeTitle: '' })).toBeNull();
  });

  it('does not match a stale anilistId by id but still tries title', () => {
    const m = matchEntry(entries, { animeTitle: 'One Piece', anilistId: 99999 });
    expect(m?.id).toBe(2);
  });
});

describe('computeAdvance', () => {
  it('advances when the detected episode is greater', () => {
    expect(computeAdvance(makeEntry({ currentEpisode: 3 }), 5)).toBe(5);
  });

  it('never decreases progress', () => {
    expect(computeAdvance(makeEntry({ currentEpisode: 10 }), 5)).toBeNull();
  });

  it('is a no-op when detected equals current', () => {
    expect(computeAdvance(makeEntry({ currentEpisode: 5 }), 5)).toBeNull();
  });

  it('clamps to the total episode count', () => {
    expect(computeAdvance(makeEntry({ currentEpisode: 20, episodes: 25 }), 99)).toBe(25);
  });

  it('returns null when clamped value would not advance (already at total)', () => {
    expect(computeAdvance(makeEntry({ currentEpisode: 25, episodes: 25 }), 99)).toBeNull();
  });

  it('allows advancing beyond a target with unknown total', () => {
    expect(computeAdvance(makeEntry({ currentEpisode: 3, episodes: undefined }), 8)).toBe(8);
  });

  it('floors fractional episode numbers', () => {
    expect(computeAdvance(makeEntry({ currentEpisode: 3 }), 5.9)).toBe(5);
  });

  it('rejects non-finite or non-positive values', () => {
    expect(computeAdvance(makeEntry(), 0)).toBeNull();
    expect(computeAdvance(makeEntry(), -2)).toBeNull();
    expect(computeAdvance(makeEntry(), Number.NaN)).toBeNull();
    expect(computeAdvance(makeEntry(), Number.POSITIVE_INFINITY)).toBeNull();
  });
});
