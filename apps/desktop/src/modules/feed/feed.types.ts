import type { FeedCategory, FeedItem, FeedLanguage, FeedSource } from '@shiroani/shared';

// ============================================
// Database row interfaces
// ============================================

export interface FeedSourceRow {
  id: number;
  name: string;
  url: string;
  site_url: string;
  category: string;
  language: string;
  color: string;
  icon: string | null;
  enabled: number; // SQLite boolean
  poll_interval_minutes: number;
  last_fetched_at: string | null;
  last_etag: string | null;
  consecutive_failures: number;
  last_error: string | null;
  supports_full_content: number; // SQLite boolean
  created_at: string;
}

export interface FeedItemRow {
  id: number;
  feed_source_id: number;
  guid: string;
  title: string;
  description: string | null;
  content_html: string | null;
  url: string;
  author: string | null;
  image_url: string | null;
  published_at: string | null;
  categories: string | null; // JSON array string
  content_hash: string;
  created_at: string;
  // Joined fields from feed_sources
  source_name?: string;
  source_color?: string;
  source_icon?: string | null;
  source_category?: string;
  source_language?: string;
  source_supports_full_content?: number;
}

// ============================================
// Row-to-type mapping functions
// ============================================

/** Map a feed_sources row to the shared FeedSource type. */
export function rowToSource(row: FeedSourceRow): FeedSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    siteUrl: row.site_url,
    category: row.category as FeedCategory,
    language: row.language as FeedLanguage,
    color: row.color,
    icon: row.icon ?? undefined,
    enabled: row.enabled === 1,
    pollIntervalMinutes: row.poll_interval_minutes,
    lastFetchedAt: row.last_fetched_at ?? undefined,
    consecutiveFailures: row.consecutive_failures,
    lastError: row.last_error ?? undefined,
    supportsFullContent: row.supports_full_content !== 0,
  };
}

/** Map a feed_items row (optionally with joined source fields) to the shared FeedItem type. */
export function rowToItem(row: FeedItemRow): FeedItem {
  return {
    id: row.id,
    feedSourceId: row.feed_source_id,
    sourceName: row.source_name ?? '',
    sourceColor: row.source_color ?? '#666',
    sourceIcon: row.source_icon ?? undefined,
    sourceCategory: (row.source_category ?? 'news') as FeedCategory,
    sourceLanguage: (row.source_language ?? 'en') as FeedLanguage,
    guid: row.guid,
    title: row.title,
    description: row.description ?? undefined,
    contentHtml: row.content_html ?? undefined,
    sourceSupportsFullContent: row.source_supports_full_content !== 0,
    url: row.url,
    author: row.author ?? undefined,
    imageUrl: row.image_url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    categories: row.categories ? JSON.parse(row.categories) : [],
    createdAt: row.created_at,
  };
}
