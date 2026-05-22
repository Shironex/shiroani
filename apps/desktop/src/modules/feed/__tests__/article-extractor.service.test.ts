/**
 * Unit tests for ArticleExtractorService.
 *
 * `fetch` is mocked so the SSRF guard, redirect validation, content-type
 * handling, and caching are exercised without real network access.
 *
 * `jsdom` and `@mozilla/readability` are mocked: jsdom pulls a chain of
 * ESM-only deps that ts-jest's CJS runner can't load, and the DOMPurify
 * sanitisation behaviour (allowlist, XSS stripping, URL rewriting) is verified
 * for real against jsdom in the web package's sanitize-html tests — the
 * allowlist is identical. Here we verify the extractor's orchestration: that it
 * fetches safely, runs Readability over the fetched HTML, sanitizes, and caches.
 */

const readabilityParseMock = jest.fn();

// Minimal jsdom stand-in: ArticleExtractorService constructs `new JSDOM(...)`,
// strips noise nodes off `.window.document` (querySelectorAll), then hands the
// document to Readability (mocked).
jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: { document: { querySelectorAll: () => [] } },
  })),
}));

jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: () => readabilityParseMock(),
  })),
}));

// DOMPurify needs a complete DOM to run; that behaviour (allowlist, XSS
// stripping, URL rewriting) is verified for real in the web sanitize-html
// tests. Here it's a passthrough so we can assert orchestration deterministically.
jest.mock('dompurify', () => {
  const factory = () => {
    const purify = (html: string) => html;
    purify.sanitize = (html: string) => html;
    purify.addHook = () => {};
    purify.removeAllHooks = () => {};
    return purify;
  };
  return { __esModule: true, default: factory };
});

import { ArticleExtractorService } from '../article-extractor.service';

function htmlResponse(body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });
}

describe('ArticleExtractorService', () => {
  let service: ArticleExtractorService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    readabilityParseMock.mockReset();
    service = new ArticleExtractorService();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('isAllowedHost', () => {
    it('allows hosts of shipped feed sources', () => {
      // animenewsnetwork.com is a DEFAULT_FEED_SOURCES siteUrl host.
      expect(service.isAllowedHost('www.animenewsnetwork.com')).toBe(true);
      expect(service.isAllowedHost('animenewsnetwork.com')).toBe(true);
    });

    it('rejects arbitrary hosts', () => {
      expect(service.isAllowedHost('evil.example.com')).toBe(false);
      expect(service.isAllowedHost('')).toBe(false);
    });
  });

  describe('extract — SSRF guard (no jsdom needed)', () => {
    it('rejects non-https URLs', async () => {
      const result = await service.extract('http://www.animenewsnetwork.com/x');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('non-https');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects private/loopback hosts', async () => {
      const result = await service.extract('https://127.0.0.1/x');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('private-host');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects non-allowlisted hosts', async () => {
      const result = await service.extract('https://evil.example.com/x');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('host-not-allowed');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects invalid URLs', async () => {
      const result = await service.extract('not a url');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('invalid-url');
    });

    it('rejects a redirect to a disallowed host', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: 'https://evil.example.com/x' } })
      );
      const result = await service.extract('https://www.animenewsnetwork.com/news/1');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toContain('redirect-to-disallowed-host');
    });

    it('follows a redirect to an allowlisted host', async () => {
      fetchMock
        .mockResolvedValueOnce(
          new Response(null, {
            status: 301,
            headers: { location: 'https://www.animenewsnetwork.com/news/2' },
          })
        )
        .mockResolvedValueOnce(htmlResponse('<html><body><article>ok</article></body></html>'));
      readabilityParseMock.mockReturnValue({ content: '<p>extracted body content</p>' });

      const result = await service.extract('https://www.animenewsnetwork.com/news/1');
      expect(result.contentHtml).toContain('extracted body content');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('rejects non-HTML content types', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      );
      const result = await service.extract('https://www.animenewsnetwork.com/news/1');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toContain('non-html-content-type');
    });

    it('rejects an oversized content-length', async () => {
      fetchMock.mockResolvedValueOnce(
        htmlResponse('<html></html>', { 'content-length': String(10 * 1024 * 1024) })
      );
      const result = await service.extract('https://www.animenewsnetwork.com/news/1');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('oversized-content-length');
    });

    it('treats an HTTP error status as a failure', async () => {
      fetchMock.mockResolvedValueOnce(htmlResponse('nope', {}));
      // Override to a 500 (htmlResponse hardcodes 200, so build directly).
      fetchMock.mockReset();
      fetchMock.mockResolvedValueOnce(
        new Response('err', { status: 500, headers: { 'content-type': 'text/html' } })
      );
      const result = await service.extract('https://www.animenewsnetwork.com/news/1');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('http-500');
    });
  });

  describe('extract — extraction + cache', () => {
    it('fetches, runs Readability, and returns the sanitized body', async () => {
      fetchMock.mockResolvedValueOnce(
        htmlResponse('<html><body><article>x</article></body></html>')
      );
      readabilityParseMock.mockReturnValue({
        content: '<p>This is the extracted article body.</p>',
      });

      const result = await service.extract('https://www.animenewsnetwork.com/news/happy');
      expect(result.contentHtml).toContain('This is the extracted article body.');
    });

    it('returns no-content when Readability finds nothing', async () => {
      fetchMock.mockResolvedValueOnce(htmlResponse('<html><body></body></html>'));
      readabilityParseMock.mockReturnValue(null);

      const result = await service.extract('https://www.animenewsnetwork.com/news/empty');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('no-content');
    });

    it('caches successful extractions (second call does not refetch)', async () => {
      fetchMock.mockResolvedValueOnce(
        htmlResponse('<html><body><article>x</article></body></html>')
      );
      readabilityParseMock.mockReturnValue({ content: '<p>cache me please body</p>' });

      const url = 'https://www.animenewsnetwork.com/news/cache-me';
      const first = await service.extract(url);
      const second = await service.extract(url);
      expect(first.contentHtml).toBe(second.contentHtml);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not cache failures (retries on the next call)', async () => {
      fetchMock
        .mockResolvedValueOnce(
          new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
        )
        .mockResolvedValueOnce(htmlResponse('<html><body><article>x</article></body></html>'));
      readabilityParseMock.mockReturnValue({ content: '<p>recovered body content</p>' });

      const url = 'https://www.animenewsnetwork.com/news/retry';
      const first = await service.extract(url);
      expect(first.contentHtml).toBeNull();
      const second = await service.extract(url);
      expect(second.contentHtml).toContain('recovered body content');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('stripNoiseElements', () => {
    it('removes page chrome (nav/aside/footer/form) before Readability scores nodes', () => {
      const removed: string[] = [];
      const makeEl = (tag: string) => ({ tagName: tag, remove: () => removed.push(tag) });
      let usedSelector = '';
      const doc = {
        querySelectorAll: (selector: string) => {
          usedSelector = selector;
          return [makeEl('NAV'), makeEl('ASIDE'), makeEl('FOOTER'), makeEl('FORM')];
        },
      } as unknown as Document;

      (service as unknown as { stripNoiseElements(d: Document): void }).stripNoiseElements(doc);

      expect(usedSelector).toContain('nav');
      expect(usedSelector).toContain('aside');
      expect(usedSelector).toContain('footer');
      expect(usedSelector).toContain('form');
      expect(removed).toEqual(['NAV', 'ASIDE', 'FOOTER', 'FORM']);
    });
  });
});
