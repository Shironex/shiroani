import { Injectable, Optional } from '@nestjs/common';
import type { AniListViewer } from '@shiroani/shared';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import { LruTtlCache } from '../kernel/lru-ttl-cache';
import { AniListTokenPort } from './anilist-token.port';
import { MEDIA_LIST_COLLECTION_QUERY } from './queries';
import type {
  AniListMediaListEntry,
  MediaListCollectionResponse,
  SaveMediaListEntryInput,
  SaveMediaListEntryResponse,
} from './types';

const logger = createLogger('AniListClient');

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const VIEWER_QUERY = `query { Viewer { id name avatar { large } bannerImage } }`;

interface GraphQLError {
  message: string;
  status: number;
}

interface GraphQLResponse<T> {
  data: T;
  errors?: GraphQLError[];
}

interface ViewerResponse {
  Viewer: {
    id: number;
    name: string;
    avatar?: { large?: string };
    bannerImage?: string;
  };
}

/**
 * AniListClient provides a reusable GraphQL client for the AniList API.
 *
 * Features:
 * - Automatic retry on 429 rate limit responses with Retry-After header
 * - Configurable max retries
 * - Structured error handling for GraphQL and network errors
 * - Uses Node.js built-in fetch (Node 22+)
 * - In-memory TTL cache for reducing redundant API calls
 */
@Injectable()
export class AniListClient {
  private readonly endpoint = 'https://graphql.anilist.co';
  private readonly maxRetries = 3;
  private readonly defaultRetryDelayMs = 2000;
  private readonly requestTimeoutMs = 15_000;
  private readonly cache = new LruTtlCache<string, unknown>(200, DEFAULT_CACHE_TTL_MS);

  constructor(@Optional() private readonly tokenPort?: AniListTokenPort) {
    logger.info('AniListClient initialized');
  }

  /**
   * Build request headers, attaching `Authorization: Bearer <token>` ONLY when
   * a token is available. Unauthenticated requests keep working unchanged when
   * no token port is wired or the user is not connected.
   */
  private async authHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = (await this.tokenPort?.getAccessToken()) ?? null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetch the authenticated AniList viewer (the connected account). Requires a
   * token via the injected {@link AniListTokenPort}; AniList returns an error
   * when unauthenticated, which surfaces as a thrown GraphQL error.
   */
  async getViewer(): Promise<AniListViewer> {
    const data = await this.query<ViewerResponse>(VIEWER_QUERY);
    const viewer = data?.Viewer;
    if (!viewer) {
      throw new Error('AniList API returned no viewer data');
    }
    return {
      id: viewer.id,
      name: viewer.name,
      avatar: viewer.avatar?.large,
      bannerImage: viewer.bannerImage,
    };
  }

  /**
   * Fetch the authenticated user's full anime MediaList (every list, one call).
   * Flattens the per-list grouping into a single array of normalized entries.
   * Never cached — sync must read the live remote state.
   *
   * @param userId - the AniList viewer id (from {@link getViewer})
   */
  async getMediaListCollection(userId: number): Promise<AniListMediaListEntry[]> {
    const data = await this.query<MediaListCollectionResponse>(MEDIA_LIST_COLLECTION_QUERY, {
      userId,
    });

    const lists = data?.MediaListCollection?.lists ?? [];
    const entries: AniListMediaListEntry[] = [];

    for (const list of lists) {
      if (!list) continue;
      for (const entry of list.entries ?? []) {
        if (!entry) continue;
        const media = entry.media;
        // An entry whose media was deleted on AniList can't be matched or
        // displayed — skip it rather than carry a mediaId with no title.
        if (!media) continue;
        entries.push({
          mediaId: entry.mediaId,
          status: entry.status,
          progress: entry.progress,
          score: entry.score,
          notes: entry.notes,
          updatedAt: entry.updatedAt ?? 0,
          episodes: media.episodes ?? undefined,
          title: media.title?.romaji ?? media.title?.english ?? media.title?.native ?? 'Unknown',
          titleRomaji: media.title?.romaji ?? undefined,
          titleNative: media.title?.native ?? undefined,
          coverImage: media.coverImage?.large ?? media.coverImage?.medium ?? undefined,
        });
      }
    }

    return entries;
  }

  /**
   * Create or update a MediaList entry on AniList (two-way sync, write side).
   *
   * The mutation is built dynamically so that ONLY the provided fields appear in
   * the GraphQL request — an omitted field is never sent, so AniList leaves the
   * existing remote value untouched. This is what lets the reconciler avoid
   * clobbering a populated remote score/notes with an empty local one (it simply
   * doesn't pass `scoreRaw`/`notes` when the local value is absent). Passing
   * `scoreRaw: 0` would set a real 0, so callers must omit instead.
   *
   * Returns the AniList `updatedAt` (epoch seconds) the server stamped, which the
   * caller records as the new remote baseline (skew-proof anti-ping-pong).
   */
  async saveMediaListEntry(input: SaveMediaListEntryInput): Promise<number> {
    const varDefs = ['$mediaId: Int!'];
    const args = ['mediaId: $mediaId'];
    const variables: Record<string, unknown> = { mediaId: input.mediaId };

    if (input.status !== undefined) {
      varDefs.push('$status: MediaListStatus');
      args.push('status: $status');
      variables.status = input.status;
    }
    if (input.progress !== undefined) {
      varDefs.push('$progress: Int');
      args.push('progress: $progress');
      variables.progress = input.progress;
    }
    if (input.scoreRaw !== undefined) {
      varDefs.push('$scoreRaw: Int');
      args.push('scoreRaw: $scoreRaw');
      variables.scoreRaw = input.scoreRaw;
    }
    if (input.notes !== undefined) {
      varDefs.push('$notes: String');
      args.push('notes: $notes');
      variables.notes = input.notes;
    }

    const mutation = `mutation AniListSaveEntry(${varDefs.join(', ')}) {
  SaveMediaListEntry(${args.join(', ')}) {
    mediaId
    status
    progress
    score(format: POINT_100)
    notes
    updatedAt
  }
}`;

    const data = await this.query<SaveMediaListEntryResponse>(mutation, variables);
    return data.SaveMediaListEntry?.updatedAt ?? 0;
  }

  /**
   * Execute a GraphQL query with in-memory TTL caching.
   * Returns cached data if a valid (non-expired) entry exists for the given key.
   *
   * @param cacheKey - Unique key identifying this query + variables combination
   * @param query - The GraphQL query string
   * @param variables - Optional variables for the query
   * @param ttlMs - Cache TTL in milliseconds (default: 5 minutes)
   */
  async cachedQuery<T>(
    cacheKey: string,
    query: string,
    variables?: Record<string, unknown>,
    ttlMs = DEFAULT_CACHE_TTL_MS
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached as T;
    }

    const data = await this.query<T>(query, variables);

    this.cache.set(cacheKey, data, ttlMs);
    return data;
  }

  /**
   * Clear all cached entries, or a specific key.
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
    logger.debug(cacheKey ? `Cache cleared for key: ${cacheKey}` : 'Cache cleared');
  }

  /**
   * Execute a GraphQL query against the AniList API.
   *
   * @param query - The GraphQL query string
   * @param variables - Optional variables for the query
   * @returns The typed data from the response
   * @throws Error on network failures, rate limit exhaustion, or GraphQL errors
   */
  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    let lastError: Error | undefined;

    const headers = await this.authHeaders();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(this.requestTimeoutMs),
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
          if (attempt < this.maxRetries) {
            logger.warn(
              `Rate limited by AniList (429). Retrying in ${retryAfter}ms (attempt ${attempt + 1}/${this.maxRetries})`
            );
            await this.sleep(retryAfter);
            continue;
          }
          throw new Error(`AniList rate limit exceeded after ${this.maxRetries} retries`);
        }

        // Handle other HTTP errors
        if (!response.ok) {
          const body = await response.text().catch(() => 'Unable to read response body');
          throw new Error(`AniList API returned HTTP ${response.status}: ${body}`);
        }

        const json = (await response.json()) as GraphQLResponse<T>;

        // Handle GraphQL-level errors
        if (json.errors && json.errors.length > 0) {
          const messages = json.errors.map(e => e.message).join('; ');
          throw new Error(`AniList GraphQL error: ${messages}`);
        }

        if (!json.data) {
          throw new Error('AniList API returned empty data');
        }

        return json.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(extractErrorMessage(error));

        // Only retry on network errors, timeouts, or rate limits — not on GraphQL/data errors
        const isRetryable =
          lastError.name === 'TimeoutError' ||
          lastError.name === 'AbortError' ||
          lastError.message.includes('rate limit') ||
          lastError.message.includes('fetch failed') ||
          lastError.message.includes('ECONNRESET') ||
          lastError.message.includes('ETIMEDOUT') ||
          lastError.message.includes('network');

        if (isRetryable && attempt < this.maxRetries) {
          const delay = this.defaultRetryDelayMs * (attempt + 1);
          logger.warn(
            `AniList request failed: ${lastError.message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`
          );
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    logger.error('AniList request failed permanently', lastError?.message);
    throw lastError ?? new Error('AniList request failed');
  }

  /**
   * Parse the Retry-After header value.
   * Can be a number of seconds or an HTTP-date.
   * Falls back to the default retry delay if parsing fails.
   */
  private parseRetryAfter(headerValue: string | null): number {
    if (!headerValue) {
      return this.defaultRetryDelayMs;
    }

    const seconds = Number(headerValue);
    if (!isNaN(seconds) && seconds > 0) {
      // Retry-After is in seconds; convert to milliseconds
      return Math.min(seconds * 1000, 60_000);
    }

    // Try parsing as HTTP-date
    const date = new Date(headerValue);
    if (!isNaN(date.getTime())) {
      const delayMs = date.getTime() - Date.now();
      return Math.max(delayMs, this.defaultRetryDelayMs);
    }

    return this.defaultRetryDelayMs;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
