/**
 * Unit tests for FeedCacheService.
 *
 * The parser is stubbed with a jest.fn() so we can assert on hit/miss
 * behavior and TTL expiry without touching the network.
 */

import { FeedCacheService } from '../feed-cache.service';
import type { FeedParserService, ParsedFeedItem } from '../feed-parser.service';

function stubItem(guid: string): ParsedFeedItem {
  return {
    guid,
    title: guid,
    description: null,
    contentHtml: null,
    url: `https://example.com/${guid}`,
    author: null,
    imageUrl: null,
    publishedAt: null,
    categories: null,
    contentHash: guid,
  };
}

describe('FeedCacheService', () => {
  let parser: { parse: jest.Mock };
  let service: FeedCacheService;

  beforeEach(() => {
    parser = { parse: jest.fn() };
    service = new FeedCacheService(parser as unknown as FeedParserService);
  });

  it('fetches from parser on cache miss', async () => {
    parser.parse.mockResolvedValue([stubItem('1')]);
    const result = await service.fetch('https://feed.example.com/rss');
    expect(parser.parse).toHaveBeenCalledWith('https://feed.example.com/rss');
    expect(parser.parse).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]!.guid).toBe('1');
  });

  it('returns cached result while entry is within TTL', async () => {
    parser.parse.mockResolvedValue([stubItem('1')]);
    await service.fetch('https://feed.example.com/rss', 5_000);
    await service.fetch('https://feed.example.com/rss', 5_000);
    expect(parser.parse).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after TTL expires', async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      parser.parse.mockResolvedValueOnce([stubItem('1')]);
      parser.parse.mockResolvedValueOnce([stubItem('2')]);

      await service.fetch('https://feed.example.com/rss', 1_000);
      jest.setSystemTime(new Date('2024-01-01T00:00:02Z')); // +2s > 1s TTL
      const result = await service.fetch('https://feed.example.com/rss', 1_000);

      expect(parser.parse).toHaveBeenCalledTimes(2);
      expect(result[0]!.guid).toBe('2');
    } finally {
      jest.useRealTimers();
    }
  });

  it('caches separate URLs independently', async () => {
    parser.parse.mockImplementation(async (url: string) => [stubItem(url)]);
    await service.fetch('https://a.example.com/rss', 5_000);
    await service.fetch('https://b.example.com/rss', 5_000);
    await service.fetch('https://a.example.com/rss', 5_000);
    await service.fetch('https://b.example.com/rss', 5_000);
    expect(parser.parse).toHaveBeenCalledTimes(2);
  });

  it('re-fetches after invalidate(url)', async () => {
    parser.parse.mockResolvedValue([]);
    await service.fetch('https://a.example.com/rss', 5_000);
    service.invalidate('https://a.example.com/rss');
    await service.fetch('https://a.example.com/rss', 5_000);
    expect(parser.parse).toHaveBeenCalledTimes(2);
  });

  it('invalidate(url) is scoped to that URL', async () => {
    parser.parse.mockResolvedValue([]);
    await service.fetch('https://a.example.com/rss', 5_000);
    await service.fetch('https://b.example.com/rss', 5_000);
    service.invalidate('https://a.example.com/rss');
    await service.fetch('https://a.example.com/rss', 5_000);
    await service.fetch('https://b.example.com/rss', 5_000);
    expect(parser.parse).toHaveBeenCalledTimes(3);
  });

  it('invalidateAll clears every cached entry', async () => {
    parser.parse.mockResolvedValue([]);
    await service.fetch('https://a.example.com/rss', 5_000);
    await service.fetch('https://b.example.com/rss', 5_000);
    service.invalidateAll();
    await service.fetch('https://a.example.com/rss', 5_000);
    await service.fetch('https://b.example.com/rss', 5_000);
    expect(parser.parse).toHaveBeenCalledTimes(4);
  });

  it('propagates parser errors without caching them', async () => {
    parser.parse.mockRejectedValueOnce(new Error('boom'));
    await expect(service.fetch('https://a.example.com/rss', 5_000)).rejects.toThrow('boom');

    parser.parse.mockResolvedValueOnce([stubItem('ok')]);
    const result = await service.fetch('https://a.example.com/rss', 5_000);
    expect(result[0]!.guid).toBe('ok');
    expect(parser.parse).toHaveBeenCalledTimes(2);
  });
});
