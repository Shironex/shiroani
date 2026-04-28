import { describe, it, expect } from 'vitest';
import { extractEpisodeNumber } from '../episode-from-url';

describe('extractEpisodeNumber', () => {
  // ── Invalid / unsupported URLs ──────────────────────────────────

  it('returns null for an invalid URL', () => {
    expect(extractEpisodeNumber('not-a-url', 'Title')).toBeNull();
  });

  it('returns null for an unsupported domain', () => {
    expect(extractEpisodeNumber('https://google.com/', 'Title')).toBeNull();
  });

  it('returns null for an empty URL', () => {
    expect(extractEpisodeNumber('', 'Title')).toBeNull();
  });

  // ── ogladajanime.pl ─────────────────────────────────────────────

  describe('ogladajanime.pl', () => {
    it('extracts episode number from /anime/{slug}/{n} URL', () => {
      expect(extractEpisodeNumber('https://ogladajanime.pl/anime/steins-gate/1', '')).toBe(1);
    });

    it('extracts double-digit episode number', () => {
      expect(extractEpisodeNumber('https://ogladajanime.pl/anime/attack-on-titan/24', '')).toBe(24);
    });

    it('extracts triple-digit episode number', () => {
      expect(extractEpisodeNumber('https://ogladajanime.pl/anime/one-piece/1050', '')).toBe(1050);
    });

    it('returns null for player URL when page title has no episode info', () => {
      expect(
        extractEpisodeNumber('https://ogladajanime.pl/anime/steins-gate/player/789', 'Steins;Gate')
      ).toBeNull();
    });

    it('extracts episode from player URL via page title "Odcinek N"', () => {
      expect(
        extractEpisodeNumber(
          'https://ogladajanime.pl/anime/steins-gate/player/789',
          'Steins;Gate — Odcinek 3 — ogladajanime.pl'
        )
      ).toBe(3);
    });

    it('returns null for anime listing page', () => {
      expect(
        extractEpisodeNumber('https://ogladajanime.pl/anime/steins-gate', 'Steins;Gate')
      ).toBeNull();
    });

    it('returns null for ogladajanime homepage', () => {
      expect(extractEpisodeNumber('https://ogladajanime.pl/', '')).toBeNull();
    });

    it('handles www prefix', () => {
      expect(
        extractEpisodeNumber('https://www.ogladajanime.pl/anime/naruto-shippuuden/15', '')
      ).toBe(15);
    });
  });

  // ── shinden.pl ──────────────────────────────────────────────────

  describe('shinden.pl', () => {
    // TODO(shinden): URL pattern unknown; provide a live URL via session handoff.
    // The /episode/{id}-{slug}/view/{viewId} path does not carry the episode ordinal,
    // so all shinden extraction relies on title scraping until the real URL is known.
    it.skip('extracts episode number from shinden episode URL (URL pattern unknown)', () => {
      // Fill in once a live shinden URL with an ordinal in the path is provided.
      expect(extractEpisodeNumber('https://shinden.pl/episode/???', '')).toBe(1);
    });

    it('extracts episode number from shinden page title "Odcinek N"', () => {
      expect(
        extractEpisodeNumber(
          'https://shinden.pl/episode/123-attack-on-titan/view/456',
          'Attack on Titan — Odcinek 5 — shinden.pl'
        )
      ).toBe(5);
    });

    it('extracts episode number from shinden page title "Episode N"', () => {
      expect(
        extractEpisodeNumber(
          'https://shinden.pl/episode/123-attack-on-titan/view/456',
          'Attack on Titan Episode 12 - shinden'
        )
      ).toBe(12);
    });

    it('returns null when shinden page title has no episode info', () => {
      expect(
        extractEpisodeNumber(
          'https://shinden.pl/episode/123-attack-on-titan/view/456',
          'Attack on Titan — shinden.pl'
        )
      ).toBeNull();
    });
  });

  // ── youtube.com ─────────────────────────────────────────────────

  describe('youtube.com', () => {
    it('returns null for youtube watch URL (out of scope for skip)', () => {
      expect(
        extractEpisodeNumber(
          'https://www.youtube.com/watch?v=abc123',
          'Cool AMV Episode 3 - YouTube'
        )
      ).toBeNull();
    });

    it('returns null for youtu.be short link', () => {
      expect(extractEpisodeNumber('https://youtu.be/abc123', 'Video')).toBeNull();
    });
  });

  // ── Title extraction edge cases ─────────────────────────────────

  describe('title extraction', () => {
    it('returns null when title is empty', () => {
      expect(extractEpisodeNumber('https://shinden.pl/episode/1-naruto/view/2', '')).toBeNull();
    });

    it('is case-insensitive for "Odcinek"', () => {
      expect(
        extractEpisodeNumber('https://shinden.pl/episode/1-naruto/view/2', 'Naruto odcinek 7')
      ).toBe(7);
    });

    it('is case-insensitive for "Episode"', () => {
      expect(
        extractEpisodeNumber('https://shinden.pl/episode/1-naruto/view/2', 'Naruto EPISODE 7')
      ).toBe(7);
    });

    it('prefers "Odcinek" over "Episode" when both appear', () => {
      expect(
        extractEpisodeNumber('https://shinden.pl/episode/1-test/view/2', 'Test Odcinek 3 Episode 9')
      ).toBe(3);
    });
  });
});
