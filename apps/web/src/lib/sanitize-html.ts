/**
 * HTML sanitisation for inline full-article rendering.
 *
 * Feed bodies (`content:encoded`, Blogger `description`) and on-demand extracted
 * articles are third-party HTML. Before any `dangerouslySetInnerHTML` we run the
 * markup through DOMPurify with a strict allowlist. This is the non-negotiable
 * last line of defence; the renderer CSP (`script-src 'self'`, `object-src
 * 'none'`, no `frame-src`) is only defence-in-depth on top of it.
 *
 * On top of the allowlist we:
 * - rewrite lazy-loaded `data-src`/`data-lazy-src`/`srcset` to a real `src`
 * - resolve relative `src`/`href` to absolute URLs against the article's base URL
 * - drop likely 1×1 tracking pixels
 * - force every link to `target="_blank" rel="noopener noreferrer nofollow"`
 */

import DOMPurify from 'dompurify';

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

let hooksInstalled = false;
/** Per-call base URL used by the relative-URL-resolving hook. */
let currentBaseUrl: string | null = null;

function resolveUrl(value: string, base: string | null): string | null {
  try {
    return new URL(value, base ?? undefined).href;
  } catch {
    return null;
  }
}

/**
 * Whether an image looks like a tracking pixel: explicit 1×1 (or smaller)
 * dimensions on the element. Real article images either omit dimensions or are
 * meaningfully sized.
 */
function isTrackingPixel(el: Element): boolean {
  const w = Number(el.getAttribute('width'));
  const h = Number(el.getAttribute('height'));
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && w <= 1 && h > 0 && h <= 1;
}

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;

  // Rewrite URLs BEFORE DOMPurify's URI filter runs, otherwise relative
  // `src`/`href` (which have no scheme) are rejected by ALLOWED_URI_REGEXP and
  // dropped before we get a chance to resolve them to absolute https URLs.
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    const el = node as Element;

    if (data.tagName === 'img') {
      // Promote lazy-loaded sources to a real `src` so the image isn't blank.
      if (!el.getAttribute('src')) {
        const lazy =
          el.getAttribute('data-src') ??
          el.getAttribute('data-lazy-src') ??
          el.getAttribute('data-original');
        if (lazy) el.setAttribute('src', lazy);
      }
      // `srcset` (incl. `data-srcset`) — take the first candidate URL as `src`.
      if (!el.getAttribute('src')) {
        const srcset = el.getAttribute('srcset') ?? el.getAttribute('data-srcset');
        const first = srcset?.split(',')[0]?.trim().split(/\s+/)[0];
        if (first) el.setAttribute('src', first);
      }

      if (isTrackingPixel(el)) {
        el.remove();
        return;
      }

      // Resolve to absolute and require https (renderer CSP is `img-src https:`).
      const src = el.getAttribute('src');
      const resolved = src ? resolveUrl(src, currentBaseUrl) : null;
      if (resolved && new URL(resolved).protocol === 'https:') {
        el.setAttribute('src', resolved);
      } else {
        el.remove();
      }
      return;
    }

    if (data.tagName === 'a') {
      const href = el.getAttribute('href');
      if (href) {
        const resolved = resolveUrl(href, currentBaseUrl);
        if (resolved && /^https?:$/.test(new URL(resolved).protocol)) {
          el.setAttribute('href', resolved);
        } else {
          el.removeAttribute('href');
        }
      }
    }
  });

  DOMPurify.addHook('afterSanitizeAttributes', node => {
    const el = node as Element;

    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer nofollow');
    }

    if (el.tagName === 'IMG') {
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
    }
  });
}

/**
 * Sanitize a third-party HTML article body into safe markup ready for
 * `dangerouslySetInnerHTML`.
 *
 * @param html  Raw HTML from the feed body or article extractor.
 * @param baseUrl  The article URL, used to resolve relative img/href URLs.
 * @returns Sanitized HTML, or an empty string when the input is empty/invalid.
 */
export function sanitizeArticleHtml(html: string | null | undefined, baseUrl?: string): string {
  if (!html || html.trim().length === 0) return '';
  installHooks();
  currentBaseUrl = baseUrl ?? null;
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS,
      FORBID_ATTR: ['style', 'srcset', 'data-src', 'data-lazy-src', 'data-srcset', 'data-original'],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      // Block javascript:/vbscript:/data: URIs on the remaining attributes.
      ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
    });
  } finally {
    currentBaseUrl = null;
  }
}
