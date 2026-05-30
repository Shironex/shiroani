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
        episode: 5,
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

  // ── crunchyroll.com ─────────────────────────────────────────────

  describe('crunchyroll.com', () => {
    it('detects from /watch/{guid}/{slug} using the page title (no episode)', () => {
      const result = detectAnimeFromUrl(
        'https://www.crunchyroll.com/watch/GRMG8ZQZR/the-strongest',
        'Frieren - Crunchyroll'
      );
      expect(result).toEqual({ animeTitle: 'Frieren' });
    });

    it('detects with a locale prefix in the path', () => {
      const result = detectAnimeFromUrl(
        'https://www.crunchyroll.com/pl/watch/ABC123/title',
        'One Piece | Crunchyroll'
      );
      expect(result).toEqual({ animeTitle: 'One Piece' });
    });

    it('never fabricates an episode number from the GUID', () => {
      const result = detectAnimeFromUrl(
        'https://www.crunchyroll.com/watch/GRMG8ZQZR/ep',
        'Bleach - Crunchyroll'
      );
      expect(result?.episode).toBeUndefined();
    });

    it('returns null for the crunchyroll homepage', () => {
      expect(detectAnimeFromUrl('https://www.crunchyroll.com/', 'Crunchyroll')).toBeNull();
    });
  });

  // ── hianime / aniwatch / zoro ───────────────────────────────────

  describe('hianime / aniwatch / zoro', () => {
    it('detects from /watch/{slug}-{id} using the page title', () => {
      const result = detectAnimeFromUrl(
        'https://hianime.to/watch/frieren-18542?ep=99999',
        'Watch Frieren English Sub/Dub online - HiAnime'
      );
      expect(result).toEqual({ animeTitle: 'Watch Frieren English Sub/Dub online' });
    });

    it('falls back to the slug when no page title is available', () => {
      const result = detectAnimeFromUrl('https://aniwatch.to/watch/one-piece-100?ep=2142', '');
      expect(result).toEqual({ animeTitle: 'One Piece' });
    });

    it('never maps the ep query id to an episode number', () => {
      const result = detectAnimeFromUrl('https://zoro.to/watch/naruto-677?ep=12345', '');
      expect(result?.episode).toBeUndefined();
    });

    it('returns null for a non-watch page', () => {
      expect(detectAnimeFromUrl('https://hianime.to/home', 'HiAnime')).toBeNull();
    });
  });

  // ── hidive.com ──────────────────────────────────────────────────

  describe('hidive.com', () => {
    it('detects from /video/{id}/{slug}', () => {
      const result = detectAnimeFromUrl(
        'https://www.hidive.com/video/12345/episode-1',
        'My Hero Academia - HIDIVE'
      );
      expect(result).toEqual({ animeTitle: 'My Hero Academia' });
    });

    it('detects from /season/{id}/{slug}', () => {
      const result = detectAnimeFromUrl('https://www.hidive.com/season/678/the-show', '');
      expect(result).toEqual({ animeTitle: 'HIDIVE' });
    });

    it('returns null for non-video pages', () => {
      expect(detectAnimeFromUrl('https://www.hidive.com/dashboard', 'HIDIVE')).toBeNull();
    });
  });

  // ── anilist.co ──────────────────────────────────────────────────

  describe('anilist.co', () => {
    it('detects the anilistId and title from /anime/{id}/{slug}', () => {
      const result = detectAnimeFromUrl(
        'https://anilist.co/anime/154587/Frieren/',
        'Frieren · AniList'
      );
      expect(result).toEqual({ animeTitle: 'Frieren', anilistId: 154587 });
    });

    it('leaves the episode undefined (info page, not a watch page)', () => {
      const result = detectAnimeFromUrl('https://anilist.co/anime/21/One-Piece', 'One Piece - AniList');
      expect(result?.episode).toBeUndefined();
      expect(result?.anilistId).toBe(21);
    });

    it('returns null for non-anime anilist pages', () => {
      expect(detectAnimeFromUrl('https://anilist.co/user/someone', 'AniList')).toBeNull();
    });
  });
});
