import { AnimeEvents, createLogger } from '@shiroani/shared';
import type { AnimeEntry } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { normalizeTitle } from './normalizeTitle';
import { jaroWinkler } from './similarity';

const logger = createLogger('resolveMalId');

const CONFIDENCE_THRESHOLD = 0.8;

export interface MalResolution {
  malId: number;
  anilistId: number;
  source: 'library-direct' | 'library-resolved' | 'anilist-search';
  confidence: number;
}

interface AniListTitleSearchResult {
  anilistId: number;
  idMal: number | undefined;
  title: { romaji?: string; english?: string; native?: string };
}

/**
 * Callback invoked when tier-2 resolution finds an anilistId for a library
 * entry that previously lacked one. Callers should persist this back to the
 * library entry so subsequent lookups hit tier-1 directly.
 */
export type OnAnilistIdResolved = (entryId: number, anilistId: number) => void;

/** Module-level in-flight dedup map — coalesces concurrent calls for the same title. */
const inFlight = new Map<string, Promise<MalResolution | null>>();

async function fetchSearchResults(title: string): Promise<AniListTitleSearchResult[]> {
  const data = await emitWithErrorHandling<
    { title: string },
    { results: AniListTitleSearchResult[] }
  >(AnimeEvents.SEARCH_BY_TITLE, { title });
  return data.results ?? [];
}

function bestMatch(
  results: AniListTitleSearchResult[],
  normalizedQuery: string
): { result: AniListTitleSearchResult; similarity: number } | null {
  let best: { result: AniListTitleSearchResult; similarity: number } | null = null;

  for (const r of results) {
    const candidates = [r.title.romaji, r.title.english, r.title.native].filter(
      Boolean
    ) as string[];
    for (const candidate of candidates) {
      const sim = jaroWinkler(normalizeTitle(candidate), normalizedQuery);
      if (!best || sim > best.similarity) {
        best = { result: r, similarity: sim };
      }
    }
  }

  return best;
}

/**
 * Resolve a MAL ID for an anime title via a 3-tier strategy:
 *
 * Tier 1 — Library direct: find an entry by normalized title → use its anilistId
 *   → fetch idMal from AniList (cached). Source: 'library-direct', confidence: 1.0.
 *
 * Tier 2 — Library resolve: library match found but no anilistId → fuzzy AniList
 *   search → if similarity > 0.8, persist anilistId back via onAnilistIdResolved.
 *   Source: 'library-resolved'.
 *
 * Tier 3 — AniList search: no library match → fuzzy AniList search → if similarity
 *   > 0.8, return result. Does NOT persist to library. Source: 'anilist-search'.
 *
 * Returns null if confidence is too low, or on fetch failure.
 * Concurrent calls for the same normalized title share one promise.
 */
export function resolveMalId(args: {
  animeTitle: string;
  libraryEntries: AnimeEntry[];
  onAnilistIdResolved?: OnAnilistIdResolved;
}): Promise<MalResolution | null> {
  const { animeTitle, libraryEntries, onAnilistIdResolved } = args;
  const normalizedQuery = normalizeTitle(animeTitle);

  const existing = inFlight.get(normalizedQuery);
  if (existing) return existing;

  const promise = resolveInternal(normalizedQuery, libraryEntries, onAnilistIdResolved).finally(
    () => {
      inFlight.delete(normalizedQuery);
    }
  );

  inFlight.set(normalizedQuery, promise);
  return promise;
}

async function resolveInternal(
  normalizedQuery: string,
  libraryEntries: AnimeEntry[],
  onAnilistIdResolved: OnAnilistIdResolved | undefined
): Promise<MalResolution | null> {
  // ── Tier 1: library direct ──────────────────────────────────────
  const libraryMatch = libraryEntries.find(e => {
    const t = normalizeTitle(e.title);
    const tr = e.titleRomaji ? normalizeTitle(e.titleRomaji) : null;
    return t === normalizedQuery || tr === normalizedQuery;
  });

  if (libraryMatch?.anilistId) {
    try {
      const details = await emitWithErrorHandling<
        { anilistId: number },
        { anime: { idMal?: number } }
      >(AnimeEvents.GET_DETAILS, { anilistId: libraryMatch.anilistId });
      const malId = details.anime?.idMal;
      if (malId) {
        logger.info(
          `Tier 1 hit: "${normalizedQuery}" → anilistId=${libraryMatch.anilistId} malId=${malId}`
        );
        return {
          malId,
          anilistId: libraryMatch.anilistId,
          source: 'library-direct',
          confidence: 1.0,
        };
      }
    } catch (err) {
      logger.warn(
        `Tier 1 AniList fetch failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ── Tier 2: library match without anilistId ─────────────────────
  if (libraryMatch && !libraryMatch.anilistId) {
    try {
      const results = await fetchSearchResults(normalizedQuery);
      const match = bestMatch(results, normalizedQuery);
      if (match && match.similarity > CONFIDENCE_THRESHOLD && match.result.idMal) {
        logger.info(
          `Tier 2 hit: "${normalizedQuery}" → anilistId=${match.result.anilistId} malId=${match.result.idMal} (sim=${match.similarity.toFixed(3)})`
        );
        onAnilistIdResolved?.(libraryMatch.id, match.result.anilistId);
        return {
          malId: match.result.idMal,
          anilistId: match.result.anilistId,
          source: 'library-resolved',
          confidence: match.similarity,
        };
      }
      logger.info(
        `Tier 2 below threshold: query="${normalizedQuery}" results=${results.length} bestTitle="${match?.result.title.romaji ?? match?.result.title.english ?? 'none'}" sim=${match?.similarity?.toFixed(3) ?? 'none'}`
      );
    } catch (err) {
      logger.warn(
        `Tier 2 AniList search failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    return null;
  }

  // ── Tier 3: no library match — read-only AniList search ─────────
  try {
    const results = await fetchSearchResults(normalizedQuery);
    const match = bestMatch(results, normalizedQuery);
    if (match && match.similarity > CONFIDENCE_THRESHOLD && match.result.idMal) {
      logger.info(
        `Tier 3 hit: "${normalizedQuery}" → anilistId=${match.result.anilistId} malId=${match.result.idMal} (sim=${match.similarity.toFixed(3)})`
      );
      return {
        malId: match.result.idMal,
        anilistId: match.result.anilistId,
        source: 'anilist-search',
        confidence: match.similarity,
      };
    }
    logger.info(
      `Tier 3 below threshold: query="${normalizedQuery}" results=${results.length} bestTitle="${match?.result.title.romaji ?? match?.result.title.english ?? 'none'}" sim=${match?.similarity?.toFixed(3) ?? 'none'}`
    );
  } catch (err) {
    logger.warn(
      `Tier 3 AniList search failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return null;
}
