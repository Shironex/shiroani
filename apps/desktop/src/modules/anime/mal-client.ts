import { Injectable, Optional } from '@nestjs/common';
import type { AnimeStatus, MalViewer } from '@shiroani/shared';
import {
  DEFAULT_MAL_CLIENT_ID,
  MAL_API_BASE,
  createLogger,
  extractErrorMessage,
} from '@shiroani/shared';
import { MalTokenPort } from './mal-token.port';

const logger = createLogger('MalClient');

/**
 * Resolve the public MAL `client_id`. Mirrors the resolution in
 * `main/auth/mal-token.adapter.ts` (env override → shared default), kept LOCAL so
 * `modules/anime` never imports from `main/`. `''` means "not configured".
 */
function resolveClientId(): string {
  return process.env.MAL_CLIENT_ID || DEFAULT_MAL_CLIENT_ID;
}

// ============================================
// MAL-local result shapes
// ============================================

/**
 * The connected MAL viewer plus the raw `anime_statistics` blob.
 *
 * Extends the renderer-safe {@link MalViewer} (id/name/avatar) without widening
 * it — the stats are kept here so the thin profile (Wave 8) can read them without
 * a second round-trip. `avatar` comes from the MAL user `picture` field, so the
 * viewer request MUST select `fields=picture` (see {@link MalClient.getViewer}).
 */
export interface MalViewerDetails extends MalViewer {
  /** Raw MAL `anime_statistics` object (kept opaque until Wave 8 consumes it). */
  animeStatistics?: Record<string, unknown>;
}

/**
 * One MAL list entry, normalized to canonical-local values (mirrors the AniList
 * adapter's per-entry normalization). `status` is the LOCAL {@link AnimeStatus}
 * union — MAL's strings match it 1:1, but the adapter owns the mapping. `score`
 * is the local 0–10 integer (MAL is already 0–10; `0` = unrated). `progress` is
 * episodes watched (`num_episodes_watched` — note the response field name differs
 * from the write field `num_watched_episodes`). `updatedAt` is epoch SECONDS
 * (MAL returns an ISO-8601 string; converted at this boundary).
 */
export interface MalListEntry {
  /** MAL anime id — the write target. */
  mediaId: number;
  /**
   * Anime title (MAL `node.title`). Carried so the sync engine has a progress
   * label without a second lookup — it satisfies the engine's `RemoteEntryCore`
   * (which requires a non-empty `title`). Empty string when MAL omits it.
   */
  title: string;
  status: AnimeStatus;
  progress: number;
  /** Local 0–10 score; 0 = unrated. */
  score: number;
  /** Provider `updated_at` as epoch seconds, or null when absent/unparseable. */
  updatedAt: number | null;
  /**
   * Cover image URL (MAL `node.main_picture.medium`, falling back to `large`), or
   * undefined when MAL omits it. Carried so a MAL-only import lands with a poster
   * instead of a blank placeholder (the list read must select `main_picture`).
   */
  coverImage?: string;
}

/** Result of {@link MalClient.updateListStatus} — the remote state after a write. */
export interface MalUpdateResult {
  status: AnimeStatus | null;
  score: number;
  /** Episodes watched — read from the RESPONSE field `num_episodes_watched`. */
  progress: number;
  /** Epoch seconds, or null when absent/unparseable. */
  updatedAt: number | null;
}

/** A single MAL search hit, for resolving MAL ids by title (MAL-only rows). */
export interface MalSearchResult {
  id: number;
  title: string;
  /** MAL `main_picture.medium` (falls back to `large`). */
  mainPicture?: string;
}

/** Canonical-local input for {@link MalClient.updateListStatus}. */
export interface MalUpdateListStatusInput {
  /** MAL anime id to write. */
  malId: number;
  status?: AnimeStatus;
  /** Local 0–10 score. Omit (not 0) to leave the remote score unchanged. */
  score?: number;
  /** Episodes watched. Sent as `num_watched_episodes` (write field name). */
  progress?: number;
}

// ============================================
// Raw MAL v2 response shapes (subset we read)
// ============================================

interface MalRawListStatus {
  status?: string | null;
  score?: number | null;
  /** RESPONSE field — note: the WRITE body uses `num_watched_episodes`. */
  num_episodes_watched?: number | null;
  is_rewatching?: boolean | null;
  updated_at?: string | null;
}

interface MalRawAnimeNode {
  id: number;
  title?: string;
  main_picture?: { medium?: string; large?: string } | null;
}

interface MalAnimeListResponse {
  data?: Array<{
    node?: MalRawAnimeNode | null;
    list_status?: MalRawListStatus | null;
  }> | null;
  paging?: { next?: string } | null;
}

interface MalAnimeSearchResponse {
  data?: Array<{ node?: MalRawAnimeNode | null }> | null;
}

interface MalUserResponse {
  id: number;
  name: string;
  picture?: string | null;
  anime_statistics?: Record<string, unknown>;
}

/** Auth strategy for a single request. */
type MalAuthMode = 'bearer' | 'client-id';

/** Internal options for the shared REST request helper. */
interface MalRequestOptions {
  method: 'GET' | 'PUT' | 'DELETE';
  /** Absolute URL (paging follows MAL's fully-formed `paging.next`) or path. */
  url: string;
  auth: MalAuthMode;
  /** Form body (writes only) — encoded as application/x-www-form-urlencoded. */
  body?: URLSearchParams;
  /** Treat a 404 as a successful no-content response (idempotent DELETE). */
  notFoundOk?: boolean;
}

/** Defensive cap so a malformed `paging.next` can never spin forever. */
const MAX_LIST_PAGES = 50;

/**
 * MAL's search `q` rejects over-long queries with `HTTP 400 {"message":"invalid
 * q"}` (the practical cap is ~64 chars; long romaji titles with subtitles blow
 * past it). Clamp to a word boundary so a long title still searches as a
 * best-effort prefix instead of failing outright.
 */
const MAL_SEARCH_MAX_Q = 64;

function clampSearchQuery(q: string): string {
  const trimmed = q.trim();
  if (trimmed.length <= MAL_SEARCH_MAX_Q) return trimmed;
  const head = trimmed.slice(0, MAL_SEARCH_MAX_Q);
  const lastSpace = head.lastIndexOf(' ');
  // Prefer a clean word boundary; fall back to a hard cut for a single long token.
  return (lastSpace > 0 ? head.slice(0, lastSpace) : head).trim();
}

/** Pick a MAL node's cover URL: `main_picture.medium`, falling back to `large`. */
function coverOf(node: {
  main_picture?: { medium?: string; large?: string } | null;
}): string | undefined {
  return node.main_picture?.medium ?? node.main_picture?.large ?? undefined;
}

/**
 * MalClient — REST client for the MyAnimeList API v2.
 *
 * Mirrors {@link AniListClient}'s resilience (Retry-After-aware 429 retry,
 * exponential backoff on network/timeout errors, `AbortSignal.timeout`, optional
 * token-port Bearer injection) but speaks REST, not GraphQL:
 *
 *   - Public reads (search) authenticate with the `X-MAL-CLIENT-ID` header.
 *   - User-context reads/writes authenticate with `Authorization: Bearer <token>`
 *     from the {@link MalTokenPort} (which lazily refreshes + rotates tokens).
 *   - Writes are `application/x-www-form-urlencoded` (NOT JSON) and use PUT — the
 *     official curl uses PUT even though the OpenAPI spec verb is PATCH; we do
 *     not build a runtime fallback (untestable without the live API).
 *
 * Bearer reads short-circuit when no token is available so "not connected" stays
 * distinct from a real network/rate-limit failure (`getViewer → null`,
 * `getAnimeList → []`).
 */
@Injectable()
export class MalClient {
  private readonly maxRetries = 3;
  private readonly defaultRetryDelayMs = 2000;
  private readonly requestTimeoutMs = 15_000;

  constructor(@Optional() private readonly tokenPort?: MalTokenPort) {
    logger.info('MalClient initialized');
  }

  /**
   * Whether a usable MAL access token is currently available. Lets Bearer callers
   * short-circuit BEFORE issuing a request, so "not connected" is never confused
   * with a query error.
   */
  async hasToken(): Promise<boolean> {
    return !!(await this.tokenPort?.getAccessToken());
  }

  /**
   * Fetch the authenticated MAL viewer. Selects `anime_statistics` (kept raw for
   * the Wave 8 profile) and `picture` (mapped to {@link MalViewer.avatar} — the
   * field name is `picture`, distinct from anime's `main_picture`). Returns
   * `null` when no token is available (not connected).
   */
  async getViewer(): Promise<MalViewerDetails | null> {
    const token = (await this.tokenPort?.getAccessToken()) ?? null;
    if (!token) return null;

    const user = await this.request<MalUserResponse>({
      method: 'GET',
      url: `${MAL_API_BASE}/users/@me?fields=anime_statistics,picture`,
      auth: 'bearer',
    });

    return {
      id: user.id,
      name: user.name,
      avatar: user.picture ?? undefined,
      animeStatistics: user.anime_statistics,
    };
  }

  /**
   * Fetch the user's full anime list, following `paging.next` until exhausted.
   * Each node is normalized to a canonical-local {@link MalListEntry}. Returns
   * `[]` when not connected (no token) — distinct from a network failure, which
   * throws. `num_episodes` (total, on the node) is requested for parity with the
   * AniList collection but is NOT the watched count (that's `list_status`).
   *
   * @param userName - MAL user name; defaults to `@me` (the connected viewer).
   */
  async getAnimeList(userName = '@me'): Promise<MalListEntry[]> {
    const token = (await this.tokenPort?.getAccessToken()) ?? null;
    if (!token) return [];

    const params = new URLSearchParams({
      // `main_picture` gives imported MAL-only rows a cover (otherwise blank).
      fields: 'list_status,num_episodes,main_picture',
      limit: '1000',
    });
    let nextUrl: string | undefined =
      `${MAL_API_BASE}/users/${encodeURIComponent(userName)}/animelist?${params.toString()}`;

    const entries: MalListEntry[] = [];
    let page = 0;

    // MAL returns `paging.next` as a fully-formed URL (offset + fields baked in),
    // so fetch it verbatim rather than re-appending query params. The page cap is
    // defensive against a malformed `next` looping forever.
    const expectedHost = new URL(MAL_API_BASE).hostname; // api.myanimelist.net
    while (nextUrl && page < MAX_LIST_PAGES) {
      // Never send the user's Bearer token to a host other than MAL's API — a
      // malformed/hostile `paging.next` must not exfiltrate the access token.
      let nextHost: string;
      try {
        nextHost = new URL(nextUrl).hostname;
      } catch {
        break;
      }
      if (nextHost !== expectedHost) {
        logger.warn(`Refusing to follow MAL paging.next to unexpected host: ${nextHost}`);
        break;
      }
      const response: MalAnimeListResponse = await this.request<MalAnimeListResponse>({
        method: 'GET',
        url: nextUrl,
        auth: 'bearer',
      });

      for (const item of response.data ?? []) {
        const node = item?.node;
        const listStatus = item?.list_status;
        if (!node || !listStatus) continue;
        entries.push(this.mapListEntry(node.id, node.title ?? '', listStatus, coverOf(node)));
      }

      nextUrl = response.paging?.next || undefined;
      page++;
    }

    return entries;
  }

  /**
   * Create or update a list entry: PUT /anime/{malId}/my_list_status.
   *
   * Body is `application/x-www-form-urlencoded`. ONLY the provided fields are
   * sent, so an omitted field leaves the remote value untouched — callers must
   * OMIT (never send `score: 0`) to keep a remote score. Note the request field
   * `num_watched_episodes` differs from the response field `num_episodes_watched`
   * (asymmetric — do not assume they match). `is_rewatching` is never written
   * (v1 folds it to `watching` on read only).
   *
   * Returns the remote state after the write ({@link MalUpdateResult}).
   */
  async updateListStatus(input: MalUpdateListStatusInput): Promise<MalUpdateResult> {
    const body = new URLSearchParams();
    if (input.status !== undefined) {
      body.set('status', input.status);
    }
    if (input.score !== undefined) {
      // Local 0–10 maps 1:1 to MAL 0–10 (integer). Round defensively.
      body.set('score', String(Math.round(input.score)));
    }
    if (input.progress !== undefined) {
      // WRITE field name — asymmetric with the response's num_episodes_watched.
      body.set('num_watched_episodes', String(input.progress));
    }

    const raw = await this.request<MalRawListStatus>({
      method: 'PUT',
      url: `${MAL_API_BASE}/anime/${input.malId}/my_list_status`,
      auth: 'bearer',
      body,
    });

    return {
      status: this.mapStatus(raw.status),
      score: raw.score ?? 0,
      progress: raw.num_episodes_watched ?? 0,
      updatedAt: this.toEpochSeconds(raw.updated_at),
    };
  }

  /**
   * Delete the user's list entry: DELETE /anime/{malId}/my_list_status.
   *
   * Idempotent — a 404 (no remote entry to delete) is treated as success rather
   * than an error, mirroring the AniList "missing entry is success" contract.
   */
  async deleteListStatus(malId: number): Promise<void> {
    await this.request<unknown>({
      method: 'DELETE',
      url: `${MAL_API_BASE}/anime/${malId}/my_list_status`,
      auth: 'bearer',
      notFoundOk: true,
    });
  }

  /**
   * Search MAL anime by title (public read) — used to resolve a MAL id for a
   * MAL-only local row. Uses the public `X-MAL-CLIENT-ID` header; throws a clear
   * "not configured" error when no `client_id` is set rather than sending an
   * empty header and getting an opaque 401. Returns the first page of hits.
   */
  async searchAnime(q: string): Promise<MalSearchResult[]> {
    if (!resolveClientId()) {
      throw new Error('MAL client is not configured (missing MAL_CLIENT_ID)');
    }

    const params = new URLSearchParams({
      q: clampSearchQuery(q),
      fields: 'id,title,main_picture',
    });
    const response = await this.request<MalAnimeSearchResponse>({
      method: 'GET',
      url: `${MAL_API_BASE}/anime?${params.toString()}`,
      auth: 'client-id',
    });

    const results: MalSearchResult[] = [];
    for (const item of response.data ?? []) {
      const node = item?.node;
      if (!node) continue;
      results.push({
        id: node.id,
        title: node.title ?? '',
        mainPicture: coverOf(node),
      });
    }
    return results;
  }

  /**
   * Fetch a SINGLE anime's `my_list_status` for the connected viewer:
   * GET /anime/{malId}?fields=my_list_status,title. Returns a canonical-local
   * {@link MalListEntry}, or `null` when not connected OR when the viewer has no
   * list entry for that anime (the node exists but `my_list_status` is absent).
   *
   * This is the single-entry read parity for {@link AniListClient.getMediaListEntry}
   * — the full-list `getAnimeList` would otherwise have to be filtered per op.
   * `updateListStatus` (a PUT) cannot serve a `pull`, so this read is required.
   */
  async getAnimeListEntry(malId: number): Promise<MalListEntry | null> {
    const token = (await this.tokenPort?.getAccessToken()) ?? null;
    if (!token) return null;

    const params = new URLSearchParams({ fields: 'my_list_status,title,main_picture' });
    const node = await this.request<MalRawAnimeNode & { my_list_status?: MalRawListStatus | null }>(
      {
        method: 'GET',
        url: `${MAL_API_BASE}/anime/${malId}?${params.toString()}`,
        auth: 'bearer',
      }
    );

    // No list entry for this anime → nothing to pull (distinct from a network error).
    if (!node.my_list_status) return null;
    return this.mapListEntry(node.id, node.title ?? '', node.my_list_status, coverOf(node));
  }

  /** Normalize a raw MAL list_status node to a canonical-local entry. */
  private mapListEntry(
    mediaId: number,
    title: string,
    raw: MalRawListStatus,
    coverImage?: string
  ): MalListEntry {
    // is_rewatching folds to 'watching' on READ (the MAL status would still be
    // 'completed' while rewatching). Apply it before the status map.
    const rawStatus = raw.is_rewatching ? 'watching' : raw.status;
    return {
      mediaId,
      title,
      // MAL strings match the local AnimeStatus 1:1; default unknowns to
      // plan_to_watch rather than dropping the row.
      status: this.mapStatus(rawStatus) ?? 'plan_to_watch',
      progress: raw.num_episodes_watched ?? 0,
      score: raw.score ?? 0,
      updatedAt: this.toEpochSeconds(raw.updated_at),
      coverImage,
    };
  }

  /**
   * Map a MAL status string to the local {@link AnimeStatus}. The vocabularies
   * are identical strings (watching/completed/on_hold/dropped/plan_to_watch), but
   * the adapter owns the mapping so the core never depends on the coincidence.
   * Returns null for an absent/unrecognized status.
   */
  private mapStatus(raw: string | null | undefined): AnimeStatus | null {
    switch (raw) {
      case 'watching':
      case 'completed':
      case 'on_hold':
      case 'dropped':
      case 'plan_to_watch':
        return raw;
      default:
        return null;
    }
  }

  /** Convert a MAL ISO-8601 `updated_at` to epoch SECONDS, or null when absent. */
  private toEpochSeconds(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return null;
    return Math.floor(ms / 1000);
  }

  /**
   * Build request headers for the given auth mode.
   *
   * - `bearer`: `Authorization: Bearer <token>` from the token port (triggers a
   *   lazy refresh). Throws when no token is available — Bearer callers should
   *   short-circuit on {@link hasToken}/null BEFORE reaching here.
   * - `client-id`: `X-MAL-CLIENT-ID: <client_id>` for public reads.
   *
   * The form `Content-Type` is added per-request (writes only), NOT here — MAL
   * reads send no body and the JSON content-type AniList hardcodes is wrong for
   * MAL's form-encoded writes.
   */
  private async buildHeaders(auth: MalAuthMode): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth === 'bearer') {
      const token = (await this.tokenPort?.getAccessToken()) ?? null;
      if (!token) {
        throw new Error('MAL request requires authentication but no token is available');
      }
      headers.Authorization = `Bearer ${token}`;
    } else {
      const clientId = resolveClientId();
      if (!clientId) {
        throw new Error('MAL client is not configured (missing MAL_CLIENT_ID)');
      }
      headers['X-MAL-CLIENT-ID'] = clientId;
    }
    return headers;
  }

  /**
   * Execute a single REST request with retry/backoff, mirroring
   * {@link AniListClient.query}:
   *   - 429 → wait Retry-After (capped) and retry up to maxRetries.
   *   - network/timeout errors → exponential backoff and retry.
   *   - other non-OK (incl. 5xx) → throw immediately (parity with AniList).
   * A DELETE 404 resolves to `undefined` when `notFoundOk` is set (idempotent).
   */
  private async request<T>(options: MalRequestOptions): Promise<T> {
    const headers = await this.buildHeaders(options.auth);
    let body: string | undefined;
    if (options.body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = options.body.toString();
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(options.url, {
          method: options.method,
          headers,
          body,
          signal: AbortSignal.timeout(this.requestTimeoutMs),
        });

        // Idempotent DELETE: a missing entry is success, not an error.
        if (options.notFoundOk && response.status === 404) {
          return undefined as T;
        }

        // Rate limiting (429) — honor Retry-After, then retry.
        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
          if (attempt < this.maxRetries) {
            logger.warn(
              `Rate limited by MAL (429). Retrying in ${retryAfter}ms (attempt ${attempt + 1}/${this.maxRetries})`
            );
            await this.sleep(retryAfter);
            continue;
          }
          throw new Error(`MAL rate limit exceeded after ${this.maxRetries} retries`);
        }

        if (!response.ok) {
          const text = await response.text().catch(() => 'Unable to read response body');
          throw new Error(`MAL API returned HTTP ${response.status}: ${text}`);
        }

        // DELETE / no-content responses carry no JSON body.
        if (response.status === 204 || options.method === 'DELETE') {
          return undefined as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(extractErrorMessage(error));

        // Retry only on network/timeout/rate-limit — not on HTTP/data errors.
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
            `MAL request failed: ${lastError.message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`
          );
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    logger.error('MAL request failed permanently', lastError?.message);
    throw lastError ?? new Error('MAL request failed');
  }

  /**
   * Parse the Retry-After header (seconds or HTTP-date). Falls back to the
   * default delay. Mirrors {@link AniListClient}.
   */
  private parseRetryAfter(headerValue: string | null): number {
    if (!headerValue) {
      return this.defaultRetryDelayMs;
    }

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
