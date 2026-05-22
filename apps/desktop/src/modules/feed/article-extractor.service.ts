import { Injectable } from '@nestjs/common';
import { Readability } from '@mozilla/readability';
import type { JSDOM as JSDOMType } from 'jsdom';
import createDOMPurify from 'dompurify';

// jsdom is loaded lazily via require(): its ESM-only transitive deps choke
// ts-jest at module-eval time, and only the article extractor needs it. esbuild
// bundles the require() fine for the production main process.
type JSDOMCtor = new (html?: string, options?: { url?: string }) => JSDOMType;
let cachedJSDOM: JSDOMCtor | null = null;
function getJSDOM(): JSDOMCtor {
  if (!cachedJSDOM) {
    cachedJSDOM = (require('jsdom') as { JSDOM: JSDOMCtor }).JSDOM;
  }
  return cachedJSDOM;
}
import {
  createLogger,
  extractErrorMessage,
  DEFAULT_FEED_SOURCES,
  type FeedGetArticleResult,
} from '@shiroani/shared';
import { LruTtlCache } from '../kernel/lru-ttl-cache';

const logger = createLogger('ArticleExtractorService');

// ── Fetch security limits (mirrors app-image-fetch.ts) ──────────────────────
const FETCH_TIMEOUT_MS = 12_000;
const FETCH_MAX_BYTES = 5 * 1024 * 1024; // 5 MB of HTML is plenty for an article
const MAX_REDIRECTS = 5;

/** Cap on the extracted+sanitized HTML we hand back / cache. */
const MAX_EXTRACTED_HTML_BYTES = 256 * 1024;

/** Cache extracted bodies so re-opening an article is instant. */
const ARTICLE_CACHE_CAP = 100;
const ARTICLE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'lang', 'dir'];

const FORBID_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  'base',
  'noscript',
  'svg',
  'math',
  'audio',
  'video',
  'source',
  'track',
];

/**
 * Block literal private/loopback/link-local addresses. Defence-in-depth against
 * SSRF via IP-literal URLs (we don't resolve DNS — the OS fetch races anyway).
 * Lifted verbatim from `app-image-fetch.ts` to keep one canonical guard shape.
 */
function isPrivateHostLiteral(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return true;

  const unbracketed =
    normalized.startsWith('[') && normalized.endsWith(']') ? normalized.slice(1, -1) : normalized;

  if (unbracketed === '::1' || unbracketed === '::') return true;
  if (/^f[cd][0-9a-f]{0,2}:/.test(unbracketed)) return true;
  if (/^fe[89ab][0-9a-f]?:/.test(unbracketed)) return true;

  const ipv4 = unbracketed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, aStr, bStr] = ipv4;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  if (unbracketed === 'localhost' || unbracketed.endsWith('.localhost')) return true;

  return false;
}

/**
 * Build the host allowlist from the known feed sources' `siteUrl` hosts. We only
 * ever fetch articles whose host matches a source we ship, never an arbitrary
 * user-supplied URL.
 */
function buildAllowedHosts(): ReadonlySet<string> {
  const hosts = new Set<string>();
  for (const source of DEFAULT_FEED_SOURCES) {
    try {
      hosts.add(new URL(source.siteUrl).hostname.toLowerCase());
    } catch {
      // ignore malformed source URLs
    }
  }
  return hosts;
}

/**
 * On-demand full-article extraction for teaser-only feeds.
 *
 * Fetches the article page through an SSRF-guarded fetch (HTTPS-only,
 * private-host block, validated redirects, size/timeout caps, host allowlist
 * derived from the shipped feed sources), runs Mozilla Readability over a
 * linkedom DOM, sanitizes the result with DOMPurify, and caches it. Returns
 * `null` whenever anything fails so the reader falls back to the teaser + CTA.
 */
@Injectable()
export class ArticleExtractorService {
  private readonly allowedHosts = buildAllowedHosts();
  private readonly cache = new LruTtlCache<string, FeedGetArticleResult>(
    ARTICLE_CACHE_CAP,
    ARTICLE_CACHE_TTL_MS
  );

  constructor() {
    logger.info('ArticleExtractorService initialized');
  }

  /** Whether `host` (or a subdomain of it) matches a shipped feed source. */
  isAllowedHost(host: string): boolean {
    const normalized = host.trim().toLowerCase();
    if (!normalized) return false;
    if (this.allowedHosts.has(normalized)) return true;
    // Allow subdomains of an allowlisted host (e.g. www.* vs apex).
    for (const allowed of this.allowedHosts) {
      if (normalized.endsWith(`.${allowed}`) || allowed.endsWith(`.${normalized}`)) return true;
    }
    return false;
  }

  /** Extract a single article, using the cache when warm. */
  async extract(url: string): Promise<FeedGetArticleResult> {
    const cached = this.cache.get(url);
    if (cached !== undefined) return cached;

    const result = await this.runExtraction(url);
    // Only cache successes — failures may be transient (network/Cloudflare).
    if (result.contentHtml !== null) {
      this.cache.set(url, result);
    }
    return result;
  }

  private async runExtraction(url: string): Promise<FeedGetArticleResult> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { contentHtml: null, error: 'invalid-url' };
    }

    if (parsed.protocol !== 'https:') {
      return { contentHtml: null, error: 'non-https' };
    }
    if (isPrivateHostLiteral(parsed.hostname)) {
      logger.warn(`[security] Blocked article extraction for private host: ${parsed.hostname}`);
      return { contentHtml: null, error: 'private-host' };
    }
    if (!this.isAllowedHost(parsed.hostname)) {
      logger.warn(
        `[security] Blocked article extraction for non-allowlisted host: ${parsed.hostname}`
      );
      return { contentHtml: null, error: 'host-not-allowed' };
    }

    let html: string;
    try {
      html = await this.fetchHtml(url);
    } catch (error) {
      const message = extractErrorMessage(error, 'fetch-failed');
      logger.warn(`Article fetch failed for ${url}: ${message}`);
      return { contentHtml: null, error: message };
    }

    try {
      const sanitized = this.parseAndSanitize(html, url);
      if (!sanitized) {
        return { contentHtml: null, error: 'no-content' };
      }
      return { contentHtml: sanitized };
    } catch (error) {
      const message = extractErrorMessage(error, 'parse-failed');
      logger.warn(`Article parse failed for ${url}: ${message}`);
      return { contentHtml: null, error: message };
    }
  }

  /**
   * SSRF-guarded HTML fetch. Validates every redirect hop before following so a
   * redirecting site can never coerce the main process into probing a private
   * or non-allowlisted host. Enforces an HTML content-type and a byte cap.
   */
  private async fetchHtml(url: string): Promise<string> {
    let currentUrl = url;
    let res!: Response;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(currentUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: 'manual',
        headers: {
          // A real UA reduces (but won't eliminate) bot-wall false positives.
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ShiroAni/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (res.status < 300 || res.status >= 400) break;
      const location = res.headers.get('location');
      if (!location) throw new Error('redirect-without-location');
      const nextUrl = new URL(location, currentUrl);
      if (
        nextUrl.protocol !== 'https:' ||
        isPrivateHostLiteral(nextUrl.hostname) ||
        !this.isAllowedHost(nextUrl.hostname)
      ) {
        throw new Error(`redirect-to-disallowed-host:${nextUrl.hostname}`);
      }
      if (hop === MAX_REDIRECTS) throw new Error('too-many-redirects');
      currentUrl = nextUrl.href;
    }

    if (!res.ok) throw new Error(`http-${res.status}`);

    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`non-html-content-type:${contentType || 'unknown'}`);
    }

    const declaredLength = Number(res.headers.get('content-length') ?? '');
    if (Number.isFinite(declaredLength) && declaredLength > FETCH_MAX_BYTES) {
      throw new Error('oversized-content-length');
    }

    if (!res.body) throw new Error('empty-body');
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > FETCH_MAX_BYTES) {
        await reader.cancel();
        throw new Error('oversized-stream');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8');
  }

  /**
   * Run Readability over the page, then DOMPurify-sanitize the extracted body.
   * Returns `null` when Readability finds no article or the result is empty.
   *
   * jsdom backs both steps: linkedom is not DOM-complete enough for DOMPurify
   * (`isSupported` is false and it returns markup unsanitized), so we use jsdom
   * which is DOMPurify's documented backing DOM. Passing the page URL to jsdom
   * lets Readability resolve relative img/href URLs to absolute.
   */
  parseAndSanitize(html: string, baseUrl: string): string | null {
    const JSDOM = getJSDOM();
    const dom = new JSDOM(html, { url: baseUrl });
    this.stripNoiseElements(dom.window.document);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    const rawHtml = article?.content?.trim();
    if (!rawHtml) return null;

    const sanitized = this.sanitize(rawHtml, baseUrl);
    if (!sanitized || sanitized.trim().length === 0) return null;
    if (Buffer.byteLength(sanitized, 'utf8') > MAX_EXTRACTED_HTML_BYTES) {
      logger.debug(`Extracted article exceeded byte cap for ${baseUrl}`);
      return null;
    }
    return sanitized;
  }

  /**
   * Strip page-level chrome before Readability scores nodes. Navigation,
   * sidebars, footers, and forms otherwise leak into the extracted body on
   * content-light pages (e.g. a site's "latest news" archive list outscoring a
   * short article). Article-level headings/figures live inside <article>/<main>
   * and are untouched.
   */
  private stripNoiseElements(doc: Document): void {
    const NOISE_SELECTOR = [
      'nav',
      'aside',
      'footer',
      'form',
      '[role="navigation"]',
      '[role="complementary"]',
      '[role="banner"]',
      '[role="search"]',
      '[aria-hidden="true"]',
    ].join(',');
    for (const el of Array.from(doc.querySelectorAll(NOISE_SELECTOR))) {
      el.remove();
    }
  }

  /** DOMPurify sanitisation matching the renderer's allowlist (jsdom window). */
  private sanitize(html: string, baseUrl: string): string {
    const JSDOM = getJSDOM();
    const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const purify = createDOMPurify(window as unknown as Window & typeof globalThis);

    purify.addHook('afterSanitizeAttributes', node => {
      const el = node as unknown as Element;

      if (el.tagName === 'A') {
        const href = el.getAttribute('href');
        // Readability already resolved relative URLs against the page URL; this
        // is a belt-and-braces re-resolve + protocol check.
        if (href) {
          const resolved = this.resolveUrl(href, baseUrl);
          if (resolved && /^https?:$/.test(new URL(resolved).protocol)) {
            el.setAttribute('href', resolved);
          } else {
            el.removeAttribute('href');
          }
        }
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer nofollow');
      }

      if (el.tagName === 'IMG') {
        const src = el.getAttribute('src');
        const resolved = src ? this.resolveUrl(src, baseUrl) : null;
        if (resolved && new URL(resolved).protocol === 'https:') {
          el.setAttribute('src', resolved);
          el.setAttribute('loading', 'lazy');
          el.setAttribute('decoding', 'async');
        } else {
          el.remove();
        }
      }
    });

    const result = purify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS,
      FORBID_ATTR: ['style', 'srcset'],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
    });
    purify.removeAllHooks();
    return result;
  }

  private resolveUrl(value: string, base: string): string | null {
    try {
      return new URL(value, base).href;
    } catch {
      return null;
    }
  }
}
