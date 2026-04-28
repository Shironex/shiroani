import { describe, it, expect } from 'vitest';
import { slugToTitle, detectAnimeFromUrl } from '../anime-detection';

describe('slugToTitle', () => {
  it('converts a hyphenated slug to title case', () => {
    expect(slugToTitle('naruto-shippuuden')).toBe('Naruto Shippuuden');
  });

  it('handles a single word', () => {
    expect(slugToTitle('naruto')).toBe('Naruto');
  });

  it('handles multiple hyphens', () => {
    expect(slugToTitle('one-piece-film-red')).toBe('One Piece Film Red');
  });

  it('handles empty string', () => {
    expect(slugToTitle('')).toBe('');
  });
});

describe('detectAnimeFromUrl', () => {
  // ── Invalid / unsupported URLs ──────────────────────────────────

  it('returns null for an invalid URL', () => {
    expect(detectAnimeFromUrl('not-a-url', 'Title')).toBeNull();
  });

  it('returns null for an unsupported domain', () => {
    expect(detectAnimeFromUrl('https://google.com/search?q=anime', 'Google')).toBeNull();
  });

  it('returns null for an empty URL', () => {
    expect(detectAnimeFromUrl('', 'Title')).toBeNull();
  });

  // ── ogladajanime.pl ─────────────────────────────────────────────

  describe('ogladajanime.pl', () => {
    it('detects anime from player URL', () => {
      const result = detectAnimeFromUrl(
        'https://ogladajanime.pl/anime/naruto-shippuuden/player/123',
        'Naruto'
      );
      expect(result).toEqual({ animeTitle: 'Naruto Shippuuden' });
    });

    it('detects anime from episode URL with episode info', () => {
      const result = detectAnimeFromUrl(
        'https://ogladajanime.pl/anime/attack-on-titan/5',
        'Attack on Titan'
      );
      expect(result).toEqual({
        animeTitle: 'Attack On Titan',
        episodeInfo: 'Odcinek 5',
        episodeNumber: 5,
      });
    });

    it('detects anime from query params action=anime&subaction=watch', () => {
      const result = detectAnimeFromUrl(
        'https://ogladajanime.pl/?action=anime&subaction=watch',
        'My Anime Title'
      );
      expect(result).toEqual({ animeTitle: 'My Anime Title' });
    });

    it('uses fallback title "Anime" when page title is empty for watch action', () => {
      const result = detectAnimeFromUrl(
        'https://ogladajanime.pl/?action=anime&subaction=watch',
        ''
      );
      expect(result).toEqual({ animeTitle: 'Anime' });
    });

    it('returns null for ogladajanime homepage', () => {
      expect(detectAnimeFromUrl('https://ogladajanime.pl/', 'Home')).toBeNull();
    });

    it('returns null for ogladajanime anime listing page', () => {
      expect(
        detectAnimeFromUrl('https://ogladajanime.pl/anime/naruto-shippuuden', 'Naruto')
      ).toBeNull();
    });

    it('handles www prefix', () => {
      const result = detectAnimeFromUrl(
        'https://www.ogladajanime.pl/anime/one-piece/player/42',
        'One Piece'
      );
      expect(result).toEqual({ animeTitle: 'One Piece' });
    });

    it('handles player URL with trailing path segments', () => {
      const result = detectAnimeFromUrl(
        'https://ogladajanime.pl/anime/demon-slayer/player/99/extra',
        ''
      );
      expect(result).toEqual({ animeTitle: 'Demon Slayer' });
    });
  });

  // ── shinden.pl ──────────────────────────────────────────────────

  describe('shinden.pl', () => {
    it('detects anime from episode view URL', () => {
      const result = detectAnimeFromUrl(
        'https://shinden.pl/episode/123-attack-on-titan/view/456',
        'Shinden'
      );
      expect(result).toEqual({ animeTitle: 'Attack On Titan' });
    });

    it('returns null for shinden non-episode pages', () => {
      expect(detectAnimeFromUrl('https://shinden.pl/anime/123', 'Shinden')).toBeNull();
    });

    it('returns null for shinden homepage', () => {
      expect(detectAnimeFromUrl('https://shinden.pl/', 'Shinden')).toBeNull();
    });

    it('handles www prefix', () => {
      const result = detectAnimeFromUrl('https://www.shinden.pl/episode/99-one-piece/view/100', '');
      expect(result).toEqual({ animeTitle: 'One Piece' });
    });
  });

  // ── youtube.com ─────────────────────────────────────────────────

  describe('youtube.com', () => {
    it('detects video from /watch?v= URL', () => {
      const result = detectAnimeFromUrl(
        'https://www.youtube.com/watch?v=abc123',
        'Cool AMV - YouTube'
      );
      expect(result).toEqual({ animeTitle: 'Cool AMV' });
    });

    it('strips " - YouTube" suffix from title', () => {
      const result = detectAnimeFromUrl('https://youtube.com/watch?v=xyz', 'My Video - YouTube');
      expect(result).toEqual({ animeTitle: 'My Video' });
    });

    it('falls back to "YouTube" when title is empty', () => {
      const result = detectAnimeFromUrl('https://youtube.com/watch?v=xyz', '');
      expect(result).toEqual({ animeTitle: 'YouTube' });
    });

    it('falls back to "YouTube" when title is only " - YouTube"', () => {
      const result = detectAnimeFromUrl('https://youtube.com/watch?v=xyz', ' - YouTube');
      expect(result).toEqual({ animeTitle: 'YouTube' });
    });

    it('returns null for youtube homepage', () => {
      expect(detectAnimeFromUrl('https://youtube.com/', 'YouTube')).toBeNull();
    });

    it('returns null for youtube channel page', () => {
      expect(detectAnimeFromUrl('https://youtube.com/@channel', 'Channel - YouTube')).toBeNull();
    });

    it('returns null for youtube search page', () => {
      expect(
        detectAnimeFromUrl('https://youtube.com/results?search_query=anime', 'Search')
      ).toBeNull();
    });

    it('detects video from m.youtube.com', () => {
      const result = detectAnimeFromUrl(
        'https://m.youtube.com/watch?v=abc',
        'Mobile Video - YouTube'
      );
      expect(result).toEqual({ animeTitle: 'Mobile Video' });
    });

    it('detects video from youtu.be short links', () => {
      const result = detectAnimeFromUrl('https://youtu.be/abc123', 'Short Video - YouTube');
      expect(result).toEqual({ animeTitle: 'Short Video' });
    });

    it('returns null for youtube /watch without v param', () => {
      expect(detectAnimeFromUrl('https://youtube.com/watch', 'YouTube')).toBeNull();
    });
  });
});
