import { Injectable } from '@nestjs/common';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import type { AniSkipResult, AniSkipResponse, AniSkipType } from './types';

const logger = createLogger('AniSkipClient');

const BASE_URL = 'https://api.aniskip.com/v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_TYPES: AniSkipType[] = ['op', 'ed'];

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * AniSkipClient fetches OP/ED skip times from the AniSkip v2 API.
 *
 * Features:
 * - 24-hour in-memory TTL cache keyed by malId:episode:episodeLength
 * - Retry on 429 with Retry-After header parsing
 * - AbortSignal timeout of 15s
 * - Silent empty-array return on 404/not-found; throws on network errors
 */
@Injectable()
export class AniSkipClient {
  private readonly maxRetries = 3;
  private readonly defaultRetryDelayMs = 2000;
  private readonly cache = new Map<string, CacheEntry<AniSkipResult[]>>();

  constructor() {
    logger.info('AniSkipClient initialized');
  }

  /**
   * Fetch OP/ED skip times for a given MAL ID and episode.
   *
   * @param malId - MyAnimeList ID for the anime
   * @param episode - Episode number (1-indexed)
   * @param episodeLength - Episode length in seconds (0 = let server pick nearest match)
   * @param types - Skip types to request (default: ['op', 'ed'])
   * @returns Array of matching skip results, or [] when the episode has no data
   * @throws Error on network failures so callers can decide whether to silent-fail
   */
  async getSkipTimes(
    malId: number,
    episode: number,
    episodeLength: number,
    types: AniSkipType[] = DEFAULT_TYPES
  ): Promise<AniSkipResult[]> {
    const cacheKey = `skip:${malId}:${episode}:${Math.round(episodeLength)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug(`Cache hit: ${cacheKey}`);
      return cached.data;
    }

    const typeParams = types.map(t => `types=${encodeURIComponent(t)}`).join('&');
    const url = `${BASE_URL}/skip-times/${malId}/${episode}?${typeParams}&episodeLength=${Math.round(episodeLength)}`;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15_000),
        });

        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
          if (attempt < this.maxRetries) {
            logger.warn(
              `Rate limited by AniSkip (429). Retrying in ${retryAfter}ms (attempt ${attempt + 1}/${this.maxRetries})`
            );
            await this.sleep(retryAfter);
            continue;
          }
          logger.warn(
            `AniSkip rate limit exceeded after ${this.maxRetries} retries — returning []`
          );
          return [];
        }

        // 404 = episode not found in AniSkip — not an error, just no data
        if (response.status === 404) {
          logger.debug(`AniSkip: no data for malId=${malId} episode=${episode}`);
          const empty: AniSkipResult[] = [];
          this.cache.set(cacheKey, { data: empty, expiresAt: Date.now() + CACHE_TTL_MS });
          return empty;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`AniSkip API returned HTTP ${response.status}: ${body}`);
        }

        const json = (await response.json()) as AniSkipResponse;

        if (!json.found || !Array.isArray(json.results) || json.results.length === 0) {
          logger.debug(`AniSkip: found=false for malId=${malId} episode=${episode}`);
          const empty: AniSkipResult[] = [];
          this.cache.set(cacheKey, { data: empty, expiresAt: Date.now() + CACHE_TTL_MS });
          return empty;
        }

        logger.info(
          `AniSkip: malId=${malId} episode=${episode} → ${json.results.length} result(s) [${json.results.map(r => r.skipType).join(', ')}]`
        );
        this.cache.set(cacheKey, {
          data: json.results,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return json.results;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(extractErrorMessage(error));

        const isRetryable =
          lastError.name === 'TimeoutError' ||
          lastError.name === 'AbortError' ||
          lastError.message.includes('fetch failed') ||
          lastError.message.includes('ECONNRESET') ||
          lastError.message.includes('ETIMEDOUT') ||
          lastError.message.includes('network');

        if (isRetryable && attempt < this.maxRetries) {
          const delay = this.defaultRetryDelayMs * (attempt + 1);
          logger.warn(
            `AniSkip request failed: ${lastError.message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`
          );
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    logger.error(`AniSkip request failed permanently: ${lastError?.message}`);
    throw lastError ?? new Error('AniSkip request failed');
  }

  /**
   * Clear all cached entries, or a specific cache key.
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
    logger.debug(cacheKey ? `Cache cleared for key: ${cacheKey}` : 'Cache cleared');
  }

  private parseRetryAfter(headerValue: string | null): number {
    if (!headerValue) return this.defaultRetryDelayMs;

    const seconds = Number(headerValue);
    if (!isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 60_000);
    }

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
