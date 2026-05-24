import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import Parser from 'rss-parser';
import { createLogger, truncate, isPrivateHostLiteral } from '@shiroani/shared';

const logger = createLogger('FeedParserService');

/** Network timeout for fetching an RSS/Atom feed before the parse aborts. */
const FEED_PARSE_TIMEOUT_MS = 30_000;

/**
 * Hard cap on the full-article HTML body we persist per item.
 *
 * Some feeds (e.g. Rascal.pl `content:encoded`) ship 100 KB+ of HTML per post.
 * Storing every body uncapped would bloat the SQLite file. 256 KB is generous
 * for an article while still bounding worst-case row size; oversized bodies are
 * dropped (the reader then falls back to the teaser + CTA).
 */
const MAX_CONTENT_HTML_BYTES = 256 * 1024;

/**
 * Minimum length (in characters) before a feed body is treated as a real
 * full-article body worth storing. Below this it's almost certainly a teaser,
 * and the existing 500-char `description` already covers it.
 */
const MIN_CONTENT_HTML_CHARS = 600;

// ============================================
// RSS Parser custom item type
// ============================================

export interface CustomItem {
  mediaThumbnail?: { $?: { url?: string } };
  mediaContent?: Array<{ $?: { url?: string; medium?: string } }>;
  enclosure?:
    | Array<{ $?: { url?: string; type?: string } }>
    | { $?: { url?: string; type?: string } };
  /** `<content:encoded>` — the full post HTML many WordPress/CMS feeds ship. */
  contentEncoded?: string;
  [key: string]: unknown;
}

// ============================================
// Parsed feed item shape (pre-DB)
// ============================================

export interface ParsedFeedItem {
  guid: string;
  title: string;
  description: string | null;
  /**
   * Full-article HTML the feed shipped (`content:encoded` or a long
   * `description`/`content`), un-truncated. `null` when the feed only carries a
   * teaser. Raw third-party HTML — it is sanitized in the renderer (DOMPurify)
   * before ever being rendered.
   */
  contentHtml: string | null;
  url: string;
  author: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  /** JSON.stringify of string[], or null when missing. */
  categories: string | null;
  contentHash: string;
}

/**
 * Pure RSS parsing and normalization.
 *
 * Fetches a feed URL, maps each `<item>` into a DB-ready {@link ParsedFeedItem}
 * and exposes the small utility helpers used along the way so they can be
 * unit-tested in isolation.
 */
@Injectable()
export class FeedParserService {
  private readonly parser = new Parser<Record<string, unknown>, CustomItem>({
    customFields: {
      item: [
        ['media:thumbnail', 'mediaThumbnail'],
        ['media:content', 'mediaContent', { keepArray: true }],
        ['enclosure', 'enclosure', { keepArray: true }],
        ['content:encoded', 'contentEncoded'],
      ],
    },
    timeout: FEED_PARSE_TIMEOUT_MS,
  });

  constructor() {
    logger.info('FeedParserService initialized');
  }

  /** Fetch an RSS/Atom feed and normalize its items. */
  async parse(feedUrl: string): Promise<ParsedFeedItem[]> {
    // SSRF guard: feed URLs are seeded from DEFAULT_FEED_SOURCES today, but
    // guard here so a future custom-feed/add-source UI can't be pointed at
    // localhost / private ranges. https-only + private-host literal block.
    const parsedUrl = new URL(feedUrl);
    if (parsedUrl.protocol !== 'https:' || isPrivateHostLiteral(parsedUrl.hostname)) {
      throw new Error(`Refusing to fetch feed from disallowed URL: ${parsedUrl.protocol}//…`);
    }

    const feed = await this.parser.parseURL(feedUrl);
    const items: ParsedFeedItem[] = [];

    for (const item of feed.items ?? []) {
      const guid = item.guid ?? item.link ?? item.title ?? '';
      if (!guid) continue;

      const url = item.link ?? '';
      if (!url) continue;

      const title = item.title ?? 'Untitled';
      const rawDescription =
        (typeof item.contentSnippet === 'string' ? item.contentSnippet : null) ??
        (typeof item.content === 'string' ? item.content : null) ??
        (typeof item.summary === 'string' ? item.summary : null) ??
        '';
      const description = this.cleanDescription(rawDescription);
      const contentHtml = this.extractContentHtml(item as CustomItem);
      const rawAuthor = item.creator ?? item.author;
      const author = typeof rawAuthor === 'string' && rawAuthor.length > 0 ? rawAuthor : null;
      const htmlForImage =
        (typeof item.content === 'string' ? item.content : null) ??
        (typeof item.summary === 'string' ? item.summary : null);
      const imageUrl = this.extractImageUrl(item as CustomItem, htmlForImage);
      const publishedAt =
        item.isoDate ??
        (item.pubDate && !Number.isNaN(Date.parse(item.pubDate))
          ? new Date(item.pubDate).toISOString()
          : null);
      const categories = item.categories ? JSON.stringify(item.categories) : null;
      const contentHash = this.generateContentHash(title, url);

      items.push({
        guid,
        title,
        description: description || null,
        contentHtml,
        url,
        author,
        imageUrl,
        publishedAt,
        categories,
        contentHash,
      });
    }

    return items;
  }

  /** Generate a SHA-256 content hash from title + url, truncated to 16 hex chars. */
  generateContentHash(title: string, url: string): string {
    return createHash('sha256').update(`${title}${url}`).digest('hex').substring(0, 16);
  }

  /**
   * Extract image URL from an RSS item.
   * Tries: media:thumbnail, media:content, enclosure, then regex for <img> in content.
   */
  extractImageUrl(item: CustomItem, htmlContent?: string | null): string | null {
    const candidate = ((): string | null => {
      // Try media:thumbnail
      if (item.mediaThumbnail?.$?.url) {
        return item.mediaThumbnail.$.url;
      }

      // Try media:content
      if (Array.isArray(item.mediaContent)) {
        for (const media of item.mediaContent) {
          if (media.$?.url) {
            return media.$.url;
          }
        }
      }

      // Try enclosure
      if (item.enclosure) {
        const enclosures = Array.isArray(item.enclosure) ? item.enclosure : [item.enclosure];
        for (const enc of enclosures) {
          if (enc.$?.url && enc.$?.type?.startsWith('image/')) {
            return enc.$.url;
          }
        }
      }

      // Try regex for <img> tag in HTML content
      if (htmlContent) {
        const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch?.[1]) {
          return imgMatch[1];
        }
      }

      return null;
    })();

    // Persist only https image URLs — feed content is attacker-influenced and
    // the renderer's CSP blocks non-https `img-src` anyway, so a non-https
    // candidate is a broken image / tracking-pixel beacon at best.
    if (!candidate) return null;
    try {
      return new URL(candidate).protocol === 'https:' ? candidate : null;
    } catch {
      return null;
    }
  }

  /** Strip HTML tags, decode common entities, and truncate to 500 chars. */
  cleanDescription(html: string): string {
    if (!html) return '';

    const text = html
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return truncate(text, 500);
  }

  /**
   * Pick the fullest HTML body the feed shipped for an item.
   *
   * Prefers `content:encoded` (WordPress/CMS full post), then falls back to the
   * longest of `content` / `summary` / `description` — Blogger feeds (Animeholik)
   * carry the full post inside `<description>`. Unlike {@link cleanDescription}
   * the markup is kept verbatim and NOT truncated; sanitization is the
   * renderer's job (DOMPurify). Returns `null` for teaser-only feeds (body below
   * {@link MIN_CONTENT_HTML_CHARS}) or bodies over {@link MAX_CONTENT_HTML_BYTES}.
   */
  extractContentHtml(item: CustomItem): string | null {
    const candidates = [
      item.contentEncoded,
      item['content:encoded'],
      item.content,
      item.summary,
      item.description,
    ];

    let best: string | null = null;
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const trimmed = candidate.trim();
      if (trimmed.length === 0) continue;
      if (best === null || trimmed.length > best.length) best = trimmed;
    }

    if (best === null) return null;

    // Teaser-length bodies add nothing over the existing `description` field.
    if (best.length < MIN_CONTENT_HTML_CHARS) return null;

    // Cap stored size to keep the SQLite file bounded. Oversized bodies fall
    // back to the teaser + CTA rather than bloating every row.
    if (Buffer.byteLength(best, 'utf8') > MAX_CONTENT_HTML_BYTES) {
      logger.debug(`Dropping oversized article body (${best.length} chars) for "${item.title}"`);
      return null;
    }

    return best;
  }
}
