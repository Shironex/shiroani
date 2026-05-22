/**
 * Regression tests for the DOMPurify sanitiser hooks in ArticleExtractorService.
 *
 * These drive the REAL production hook logic (`uponSanitizeElement` /
 * `afterSanitizeAttributes`) — not the identity-passthrough DOMPurify mock the
 * orchestration suite uses — to lock in two behaviours that previously shipped
 * broken:
 *
 *   1. relative `src`/`href` resolve to absolute https against the article base
 *      URL (the old code did this in `afterSanitizeAttributes`, which runs AFTER
 *      DOMPurify's `ALLOWED_URI_REGEXP` has already stripped relative URLs, so it
 *      silently no-op'd), and
 *   2. lazy-image attributes (`data-src`/`srcset`/…) are promoted to a real
 *      `src` (the desktop sanitiser was missing the renderer's promotion).
 *
 * We exercise the hooks directly against a minimal DOM-element stand-in rather
 * than a full jsdom window: jsdom can't load under ts-jest's CJS runner (an
 * ESM-only transitive dep — the same reason the orchestration suite mocks it),
 * so we can't run the whole real-DOMPurify pipeline here. That full pipeline,
 * over identical hooks, IS verified against real jsdom in the web package's
 * `sanitize-html` tests.
 */

import { ArticleExtractorService } from '../article-extractor.service';

const BASE = 'https://www.animenewsnetwork.com/articles/post';

/**
 * Minimal stand-in for the DOM `Element` surface the hooks touch:
 * get/set/removeAttribute, `tagName`, and `remove()`.
 */
function makeEl(tagName: string, attrs: Record<string, string> = {}) {
  const attributes = new Map<string, string>(Object.entries(attrs));
  let removed = false;
  const el = {
    tagName: tagName.toUpperCase(),
    getAttribute: (name: string) => (attributes.has(name) ? attributes.get(name)! : null),
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    remove: () => {
      removed = true;
    },
    get removed() {
      return removed;
    },
  };
  return el;
}

interface HookAccess {
  uponSanitizeElement(el: Element, tagName: string): void;
  afterSanitizeAttributes(el: Element): void;
  currentBaseUrl: string | null;
}

function withBase(service: ArticleExtractorService, baseUrl: string): HookAccess {
  const access = service as unknown as HookAccess;
  access.currentBaseUrl = baseUrl;
  return access;
}

describe('ArticleExtractorService sanitiser hooks', () => {
  let service: ArticleExtractorService;

  beforeEach(() => {
    service = new ArticleExtractorService();
  });

  describe('uponSanitizeElement — anchors', () => {
    it('resolves a relative href to an absolute https URL', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('a', { href: '/other' });
      hooks.uponSanitizeElement(el as unknown as Element, 'a');
      expect(el.getAttribute('href')).toBe('https://www.animenewsnetwork.com/other');
    });

    it('keeps an already-absolute https href intact', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('a', { href: 'https://other.example.com/x' });
      hooks.uponSanitizeElement(el as unknown as Element, 'a');
      expect(el.getAttribute('href')).toBe('https://other.example.com/x');
    });

    it('drops an href that does not resolve to http(s)', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('a', { href: 'mailto:hi@example.com' });
      hooks.uponSanitizeElement(el as unknown as Element, 'a');
      expect(el.getAttribute('href')).toBeNull();
    });
  });

  describe('uponSanitizeElement — images', () => {
    it('resolves a relative src to an absolute https URL', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('img', { src: '/img/cover.jpg' });
      hooks.uponSanitizeElement(el as unknown as Element, 'img');
      expect(el.getAttribute('src')).toBe('https://www.animenewsnetwork.com/img/cover.jpg');
      expect(el.removed).toBe(false);
    });

    it('promotes data-src to src when src is absent', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('img', { 'data-src': 'https://cdn.example.com/lazy.jpg' });
      hooks.uponSanitizeElement(el as unknown as Element, 'img');
      expect(el.getAttribute('src')).toBe('https://cdn.example.com/lazy.jpg');
    });

    it('promotes data-lazy-src and data-original as fallbacks', () => {
      const hooks = withBase(service, BASE);
      const lazy = makeEl('img', { 'data-lazy-src': 'https://cdn.example.com/a.jpg' });
      hooks.uponSanitizeElement(lazy as unknown as Element, 'img');
      expect(lazy.getAttribute('src')).toBe('https://cdn.example.com/a.jpg');

      const original = makeEl('img', { 'data-original': '/rel/b.jpg' });
      hooks.uponSanitizeElement(original as unknown as Element, 'img');
      expect(original.getAttribute('src')).toBe('https://www.animenewsnetwork.com/rel/b.jpg');
    });

    it('takes the first candidate from srcset when src is absent', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('img', {
        srcset: 'https://cdn.example.com/a.jpg 1x, https://cdn.example.com/b.jpg 2x',
      });
      hooks.uponSanitizeElement(el as unknown as Element, 'img');
      expect(el.getAttribute('src')).toBe('https://cdn.example.com/a.jpg');
    });

    it('drops a 1x1 tracking pixel', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('img', {
        src: 'https://track.example.com/p.gif',
        width: '1',
        height: '1',
      });
      hooks.uponSanitizeElement(el as unknown as Element, 'img');
      expect(el.removed).toBe(true);
    });

    it('drops an image that cannot resolve to an https URL', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('img', { src: 'http://insecure.example.com/x.jpg' });
      hooks.uponSanitizeElement(el as unknown as Element, 'img');
      expect(el.removed).toBe(true);
    });
  });

  describe('afterSanitizeAttributes — hardening', () => {
    it('forces target=_blank and rel on anchors', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('a', { href: 'https://other.example.com/x' });
      hooks.afterSanitizeAttributes(el as unknown as Element);
      expect(el.getAttribute('target')).toBe('_blank');
      expect(el.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    });

    it('sets loading=lazy and decoding=async on images', () => {
      const hooks = withBase(service, BASE);
      const el = makeEl('img', { src: 'https://cdn.example.com/x.jpg' });
      hooks.afterSanitizeAttributes(el as unknown as Element);
      expect(el.getAttribute('loading')).toBe('lazy');
      expect(el.getAttribute('decoding')).toBe('async');
    });
  });
});
