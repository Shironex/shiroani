import { Injectable } from '@nestjs/common';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import { LruTtlCache } from '../kernel/lru-ttl-cache';

const logger = createLogger('AniListClient');

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface GraphQLError {
  message: string;
  status: number;
}

interface GraphQLResponse<T> {
  data: T;
  errors?: GraphQLError[];
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

  constructor() {
    logger.info('AniListClient initialized');
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

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
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
