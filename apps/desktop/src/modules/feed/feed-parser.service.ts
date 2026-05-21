import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import Parser from 'rss-parser';
import { createLogger, truncate } from '@shiroani/shared';

const logger = createLogger('FeedParserService');

/** Network timeout for fetching an RSS/Atom feed before the parse aborts. */
const FEED_PARSE_TIMEOUT_MS = 30_000;

// ============================================
// RSS Parser custom item type
// ============================================

export interface CustomItem {
  mediaThumbnail?: { $?: { url?: string } };
  mediaContent?: Array<{ $?: { url?: string; medium?: string } }>;
  enclosure?:
    | Array<{ $?: { url?: string; type?: string } }>
    | { $?: { url?: string; type?: string } };
  [key: string]: unknown;
}

// ============================================
// Parsed feed item shape (pre-DB)
// ============================================

export interface ParsedFeedItem {
  guid: string;
  title: string;
  description: string | null;
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
      ],
    },
    timeout: FEED_PARSE_TIMEOUT_MS,
  });

  constructor() {
    logger.info('FeedParserService initialized');
  }

  /** Fetch an RSS/Atom feed and normalize its items. */
  async parse(feedUrl: string): Promise<ParsedFeedItem[]> {
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
}
