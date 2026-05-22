/**
 * Feed Types - Types for the anime news/activity feed feature
 */

// ============================================
// Feed Source
// ============================================

export type FeedCategory = 'news' | 'episodes' | 'reviews' | 'community';
export type FeedLanguage = 'en' | 'pl';

export interface FeedSource {
  id: number;
  name: string;
  url: string;
  siteUrl: string;
  category: FeedCategory;
  language: FeedLanguage;
  color: string;
  icon?: string;
  enabled: boolean;
  pollIntervalMinutes: number;
  lastFetchedAt?: string;
  consecutiveFailures: number;
  lastError?: string;
  /**
   * Whether on-demand article extraction (Phase 2) should be attempted for this
   * source's teaser items. `false` for sources where Readability extraction is
   * noisy (navigation/archive bleed), fails (SPA pages), or is pointless
   * (episode-metadata feeds) — those fall back to the teaser + CTA.
   */
  supportsFullContent: boolean;
}

// ============================================
// Feed Item
// ============================================

export interface FeedItem {
  id: number;
  feedSourceId: number;
  sourceName: string;
  sourceColor: string;
  sourceIcon?: string;
  sourceCategory: FeedCategory;
  sourceLanguage: FeedLanguage;
  guid: string;
  title: string;
  description?: string;
  /**
   * Sanitized full-article HTML when the source ships a complete body in its
   * feed (e.g. `content:encoded`). Absent for teaser-only feeds — the reader
   * falls back to the `description` teaser + "open on site" CTA, or to
   * on-demand article extraction.
   */
  contentHtml?: string;
  /**
   * Denormalized from the item's source: whether on-demand extraction may be
   * attempted for this item. Lets the reader skip the loading spinner and show
   * the teaser + CTA immediately for extraction-disabled sources.
   */
  sourceSupportsFullContent: boolean;
  url: string;
  author?: string;
  imageUrl?: string;
  publishedAt?: string;
  categories: string[];
  createdAt: string;
  /** Epoch ms when the user opened this item in the reader. Client-only, never sent by the backend. */
  readAt?: number;
}

// ============================================
// Feed Payloads
// ============================================

export interface FeedGetItemsPayload {
  category?: FeedCategory | 'all';
  language?: FeedLanguage | 'all';
  sourceId?: number;
  limit?: number;
  offset?: number;
}

export interface FeedGetItemsResult {
  items: FeedItem[];
  total: number;
  hasMore: boolean;
}

export interface FeedGetSourcesResult {
  sources: FeedSource[];
}

export interface FeedToggleSourcePayload {
  id: number;
  enabled: boolean;
}

export interface FeedGetArticlePayload {
  /** The feed item's article URL to extract. */
  url: string;
}

export interface FeedGetArticleResult {
  /**
   * Extracted, sanitized article HTML, or `null` when extraction failed,
   * the host wasn't allowlisted, the page was empty/paywalled/Cloudflare-gated,
   * etc. The reader falls back to the teaser + CTA on `null`.
   */
  contentHtml: string | null;
  /** Set when extraction was attempted but failed (for logging/telemetry). */
  error?: string;
}

// ============================================
// Default Feed Sources
// ============================================

export interface DefaultFeedSource {
  name: string;
  url: string;
  siteUrl: string;
  category: FeedCategory;
  language: FeedLanguage;
  color: string;
  icon?: string;
  pollIntervalMinutes: number;
  /**
   * Attempt on-demand article extraction for this source's teaser items.
   * Defaults to `true` when omitted. Set `false` for SPA/teaser-noisy sources.
   */
  supportsFullContent?: boolean;
}

export const DEFAULT_FEED_SOURCES: DefaultFeedSource[] = [
  // English - News
  {
    name: 'Anime News Network',
    url: 'https://www.animenewsnetwork.com/news/rss.xml',
    siteUrl: 'https://www.animenewsnetwork.com',
    category: 'news',
    language: 'en',
    color: '#1d4999',
    pollIntervalMinutes: 30,
    // Article pages bleed the "latest news" archive list into Readability output.
    supportsFullContent: false,
  },
  {
    name: 'MyAnimeList',
    url: 'https://myanimelist.net/rss/news.xml',
    siteUrl: 'https://myanimelist.net',
    category: 'news',
    language: 'en',
    color: '#2e51a2',
    pollIntervalMinutes: 60,
    supportsFullContent: false,
  },
  {
    name: 'Crunchyroll',
    url: 'https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss',
    siteUrl: 'https://www.crunchyroll.com',
    category: 'news',
    language: 'en',
    color: '#f47521',
    pollIntervalMinutes: 60,
    // SPA pages have no server-rendered body for Readability; feed ships content.
    supportsFullContent: false,
  },
  {
    name: 'Anime Corner',
    url: 'https://animecorner.me/feed/',
    siteUrl: 'https://animecorner.me',
    category: 'news',
    language: 'en',
    color: '#e74c3c',
    pollIntervalMinutes: 60,
    supportsFullContent: false,
  },
  // English - Episodes
  {
    name: 'LiveChart Episodes',
    url: 'https://www.livechart.me/feeds/episodes',
    siteUrl: 'https://www.livechart.me',
    category: 'episodes',
    language: 'en',
    color: '#00c853',
    pollIntervalMinutes: 30,
    // Episode-notification feed — no article body to extract.
    supportsFullContent: false,
  },
  {
    name: 'AnimeSchedule (Subs)',
    url: 'https://animeschedule.net/subrss.xml',
    siteUrl: 'https://animeschedule.net',
    category: 'episodes',
    language: 'en',
    color: '#9c27b0',
    pollIntervalMinutes: 15,
    supportsFullContent: false,
  },
  // English - Reviews
  {
    name: 'ANN Reviews',
    url: 'https://www.animenewsnetwork.com/all-reviews/rss.xml',
    siteUrl: 'https://www.animenewsnetwork.com',
    category: 'reviews',
    language: 'en',
    color: '#1d4999',
    pollIntervalMinutes: 120,
    supportsFullContent: false,
  },
  // Polish - News
  {
    name: 'Animeholik',
    url: 'https://www.animeholik.pl/feeds/posts/default?alt=rss',
    siteUrl: 'https://www.animeholik.pl',
    category: 'news',
    language: 'pl',
    color: '#ff6b6b',
    pollIntervalMinutes: 120,
  },
  {
    name: 'Anime.com.pl',
    url: 'https://anime.com.pl/feed.php?mode=rss&content=news',
    siteUrl: 'https://anime.com.pl',
    category: 'news',
    language: 'pl',
    color: '#4a90d9',
    pollIntervalMinutes: 120,
  },
  // Polish - Reviews
  {
    name: 'Rascal.pl',
    url: 'https://rascal.pl/feed',
    siteUrl: 'https://rascal.pl',
    category: 'reviews',
    language: 'pl',
    color: '#e67e22',
    pollIntervalMinutes: 180,
  },
  {
    name: 'Monime.pl',
    url: 'https://www.monime.pl/feed',
    siteUrl: 'https://www.monime.pl',
    category: 'reviews',
    language: 'pl',
    color: '#2ecc71',
    pollIntervalMinutes: 180,
  },
];
