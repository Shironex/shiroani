/**
 * Unit tests for FeedParserService.
 *
 * The rss-parser library is mocked so tests exercise pure normalization
 * logic (helpers + parse mapping) without touching the network.
 */

import { FeedParserService, type CustomItem } from '../feed-parser.service';

const parseURLMock = jest.fn();

jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: (...args: unknown[]) => parseURLMock(...args),
  }));
});

describe('FeedParserService', () => {
  let service: FeedParserService;

  beforeEach(() => {
    parseURLMock.mockReset();
    service = new FeedParserService();
  });

  describe('cleanDescription', () => {
    it('returns empty string for empty/falsy input', () => {
      expect(service.cleanDescription('')).toBe('');
    });

    it('strips HTML tags', () => {
      expect(service.cleanDescription('<p>Hello <b>world</b></p>')).toBe('Hello world');
    });

    it('decodes common named entities', () => {
      expect(service.cleanDescription('Tom &amp; Jerry &lt;3 &quot;cats&quot;')).toBe(
        'Tom & Jerry <3 "cats"'
      );
      expect(service.cleanDescription('a&#39;b&nbsp;c')).toBe("a'b c");
    });

    it('decodes numeric and hex entities', () => {
      expect(service.cleanDescription('&#65;&#x42;&#x43;')).toBe('ABC');
    });

    it('collapses whitespace and trims', () => {
      expect(service.cleanDescription('  foo\n\t  bar\n\n\nbaz  ')).toBe('foo bar baz');
    });

    it('truncates to 500 characters with ellipsis', () => {
      const long = 'a'.repeat(600);
      const result = service.cleanDescription(long);
      expect(result).toHaveLength(500);
      expect(result.endsWith('...')).toBe(true);
    });

    it('does not truncate strings at or below 500 chars', () => {
      const at = 'x'.repeat(500);
      expect(service.cleanDescription(at)).toBe(at);
    });
  });

  describe('extractImageUrl', () => {
    it('prefers media:thumbnail over all other sources', () => {
      const item: CustomItem = {
        mediaThumbnail: { $: { url: 'https://cdn.example.com/thumb.jpg' } },
        mediaContent: [{ $: { url: 'https://cdn.example.com/content.jpg' } }],
        enclosure: { $: { url: 'https://cdn.example.com/enc.jpg', type: 'image/jpeg' } },
      };
      expect(service.extractImageUrl(item, '<img src="https://regex.example.com/x.jpg">')).toBe(
        'https://cdn.example.com/thumb.jpg'
      );
    });

    it('falls back to media:content when thumbnail is missing', () => {
      const item: CustomItem = {
        mediaContent: [{ $: { url: 'https://cdn.example.com/content.jpg' } }],
      };
      expect(service.extractImageUrl(item)).toBe('https://cdn.example.com/content.jpg');
    });

    it('uses the first media:content with a url', () => {
      const item: CustomItem = {
        mediaContent: [{ $: {} }, { $: { url: 'https://cdn.example.com/second.jpg' } }],
      };
      expect(service.extractImageUrl(item)).toBe('https://cdn.example.com/second.jpg');
    });

    it('accepts an image/* enclosure when media fields absent', () => {
      const item: CustomItem = {
        enclosure: { $: { url: 'https://cdn.example.com/enc.png', type: 'image/png' } },
      };
      expect(service.extractImageUrl(item)).toBe('https://cdn.example.com/enc.png');
    });

    it('ignores non-image enclosures', () => {
      const item: CustomItem = {
        enclosure: { $: { url: 'https://cdn.example.com/audio.mp3', type: 'audio/mpeg' } },
      };
      expect(service.extractImageUrl(item)).toBeNull();
    });

    it('handles array-shaped enclosure', () => {
      const item: CustomItem = {
        enclosure: [
          { $: { url: 'https://cdn.example.com/audio.mp3', type: 'audio/mpeg' } },
          { $: { url: 'https://cdn.example.com/pic.jpg', type: 'image/jpeg' } },
        ],
      };
      expect(service.extractImageUrl(item)).toBe('https://cdn.example.com/pic.jpg');
    });

    it('falls back to <img> regex in HTML content', () => {
      const item: CustomItem = {};
      expect(
        service.extractImageUrl(
          item,
          '<p>foo<img src="https://cdn.example.com/fallback.jpg" /></p>'
        )
      ).toBe('https://cdn.example.com/fallback.jpg');
    });

    it('returns null when no source yields a URL', () => {
      expect(service.extractImageUrl({})).toBeNull();
      expect(service.extractImageUrl({}, '<p>no images here</p>')).toBeNull();
      expect(service.extractImageUrl({}, null)).toBeNull();
      expect(service.extractImageUrl({}, undefined)).toBeNull();
    });
  });

  describe('extractContentHtml', () => {
    const longBody = (tag = 'p') => `<${tag}>${'word '.repeat(200)}</${tag}>`;

    it('returns null when no body field is present', () => {
      expect(service.extractContentHtml({})).toBeNull();
    });

    it('returns null for teaser-length bodies (below the min threshold)', () => {
      expect(service.extractContentHtml({ description: '<p>short teaser</p>' })).toBeNull();
    });

    it('captures content:encoded full HTML un-truncated', () => {
      const body = longBody();
      expect(service.extractContentHtml({ contentEncoded: body })).toBe(body);
    });

    it('reads content:encoded via the raw key as well', () => {
      const body = longBody();
      expect(service.extractContentHtml({ 'content:encoded': body })).toBe(body);
    });

    it('prefers the longest available HTML field (Blogger full description)', () => {
      const long = longBody('div');
      const short = '<p>excerpt</p>';
      expect(service.extractContentHtml({ description: long, summary: short })).toBe(long);
    });

    it('does not truncate large bodies the way cleanDescription does', () => {
      const body = `<p>${'x'.repeat(5000)}</p>`;
      const result = service.extractContentHtml({ contentEncoded: body });
      expect(result).toBe(body);
      expect(result!.length).toBeGreaterThan(500);
    });

    it('drops bodies that exceed the byte cap', () => {
      const huge = `<p>${'x'.repeat(300 * 1024)}</p>`;
      expect(service.extractContentHtml({ contentEncoded: huge })).toBeNull();
    });
  });

  describe('generateContentHash', () => {
    it('returns a 16-character hex string', () => {
      const hash = service.generateContentHash('title', 'https://example.com');
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it('is deterministic for the same inputs', () => {
      expect(service.generateContentHash('t', 'u')).toBe(service.generateContentHash('t', 'u'));
    });

    it('differs when inputs differ', () => {
      const a = service.generateContentHash('t1', 'u');
      const b = service.generateContentHash('t2', 'u');
      const c = service.generateContentHash('t1', 'u2');
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
      expect(b).not.toBe(c);
    });
  });

  describe('parse()', () => {
    it('calls parser.parseURL with the given URL', async () => {
      parseURLMock.mockResolvedValue({ items: [] });
      await service.parse('https://feed.example.com/rss');
      expect(parseURLMock).toHaveBeenCalledWith('https://feed.example.com/rss');
    });

    it('returns empty array when feed.items is null/undefined', async () => {
      parseURLMock.mockResolvedValue({});
      const result = await service.parse('https://feed.example.com/rss');
      expect(result).toEqual([]);
    });

    it('skips items missing both guid and link', async () => {
      parseURLMock.mockResolvedValue({
        items: [
          { title: 'no guid or link' },
          { guid: 'g1', link: 'https://a.example.com', title: 'ok' },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result).toHaveLength(1);
      expect(result[0]!.guid).toBe('g1');
    });

    it('skips items with no link/url', async () => {
      parseURLMock.mockResolvedValue({
        items: [
          { guid: 'g1', title: 'no link' },
          { guid: 'g2', title: 'no link either', link: '' },
          { guid: 'g3', link: 'https://a.example.com', title: 'ok' },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result).toHaveLength(1);
      expect(result[0]!.guid).toBe('g3');
    });

    it('maps publishedAt from isoDate first, then pubDate, then null', async () => {
      parseURLMock.mockResolvedValue({
        items: [
          {
            guid: 'a',
            link: 'https://a.example.com',
            title: 'A',
            isoDate: '2024-01-01T00:00:00Z',
            pubDate: 'Wed, 02 Jan 2024 00:00:00 GMT',
          },
          {
            guid: 'b',
            link: 'https://b.example.com',
            title: 'B',
            pubDate: 'Wed, 02 Jan 2024 00:00:00 GMT',
          },
          {
            guid: 'c',
            link: 'https://c.example.com',
            title: 'C',
          },
          {
            guid: 'd',
            link: 'https://d.example.com',
            title: 'D',
            pubDate: 'not-a-real-date',
          },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result).toHaveLength(4);
      expect(result[0]!.publishedAt).toBe('2024-01-01T00:00:00Z');
      expect(result[1]!.publishedAt).toBe(new Date('Wed, 02 Jan 2024 00:00:00 GMT').toISOString());
      expect(result[2]!.publishedAt).toBeNull();
      expect(result[3]!.publishedAt).toBeNull();
    });

    it('falls back guid -> link -> title when guid is missing', async () => {
      parseURLMock.mockResolvedValue({
        items: [{ link: 'https://a.example.com/post', title: 'no guid' }],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.guid).toBe('https://a.example.com/post');
    });

    it('serializes categories as JSON and leaves null when absent', async () => {
      parseURLMock.mockResolvedValue({
        items: [
          {
            guid: 'a',
            link: 'https://a.example.com',
            title: 'A',
            categories: ['news', 'anime'],
          },
          { guid: 'b', link: 'https://b.example.com', title: 'B' },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.categories).toBe('["news","anime"]');
      expect(result[1]!.categories).toBeNull();
    });

    it('cleans description and picks first non-empty source', async () => {
      parseURLMock.mockResolvedValue({
        items: [
          {
            guid: 'a',
            link: 'https://a.example.com',
            title: 'A',
            contentSnippet: '<p>snippet &amp; text</p>',
            content: '<p>full content</p>',
          },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.description).toBe('snippet & text');
    });

    it('captures the full content:encoded body into contentHtml', async () => {
      const body = `<p>${'word '.repeat(200)}</p>`;
      parseURLMock.mockResolvedValue({
        items: [
          {
            guid: 'a',
            link: 'https://a.example.com',
            title: 'A',
            contentSnippet: 'short teaser',
            contentEncoded: body,
          },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.contentHtml).toBe(body);
      // The teaser path is untouched — description stays the short cleaned text.
      expect(result[0]!.description).toBe('short teaser');
    });

    it('leaves contentHtml null for teaser-only feeds', async () => {
      parseURLMock.mockResolvedValue({
        items: [
          {
            guid: 'a',
            link: 'https://a.example.com',
            title: 'A',
            contentSnippet: 'short teaser',
            content: '<p>short teaser</p>',
          },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.contentHtml).toBeNull();
    });

    it('returns null description when all description sources are empty', async () => {
      parseURLMock.mockResolvedValue({
        items: [{ guid: 'a', link: 'https://a.example.com', title: 'A' }],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.description).toBeNull();
    });

    it('falls back to "Untitled" for items without a title', async () => {
      parseURLMock.mockResolvedValue({
        items: [{ guid: 'g', link: 'https://a.example.com' }],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.title).toBe('Untitled');
    });

    it('maps author from creator, then author, else null', async () => {
      parseURLMock.mockResolvedValue({
        items: [
          { guid: 'a', link: 'https://a.example.com', title: 'A', creator: 'Alice' },
          { guid: 'b', link: 'https://b.example.com', title: 'B', author: 'Bob' },
          { guid: 'c', link: 'https://c.example.com', title: 'C' },
        ],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.author).toBe('Alice');
      expect(result[1]!.author).toBe('Bob');
      expect(result[2]!.author).toBeNull();
    });

    it('computes a stable content hash for every item', async () => {
      parseURLMock.mockResolvedValue({
        items: [{ guid: 'a', link: 'https://a.example.com/post', title: 'Hello' }],
      });
      const result = await service.parse('https://feed.example.com/rss');
      expect(result[0]!.contentHash).toMatch(/^[0-9a-f]{16}$/);
      expect(result[0]!.contentHash).toBe(
        service.generateContentHash('Hello', 'https://a.example.com/post')
      );
    });
  });
});
