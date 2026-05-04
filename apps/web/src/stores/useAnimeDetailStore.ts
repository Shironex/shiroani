import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { AnimeEvents, createLogger, type AnimeDetail } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';

const logger = createLogger('AnimeDetailStore');

interface AnimeDetailState {
  /** In-memory cache of fetched details keyed by AniList media id. Session-scoped. */
  details: Map<number, AnimeDetail>;
  /** Ids currently being fetched, to dedupe concurrent requests. */
  inFlight: Set<number>;
  /** Ids whose last fetch failed — skip on subsequent ensure() calls until refreshed. */
  failed: Set<number>;
}

interface AnimeDetailActions {
  /**
   * Kick off fetches for any ids that aren't already cached, in-flight, or
   * known-failed. Fires in parallel — no batching required since the socket
   * backend handles concurrent calls.
   */
  ensureDetails: (ids: readonly number[]) => void;
  /** Manually retry a previously-failed id. */
  retry: (id: number) => void;
  /** Drop the cache (used rarely — e.g. for a "refresh metadata" admin action). */
  clear: () => void;
}

type AnimeDetailStore = AnimeDetailState & AnimeDetailActions;

export const useAnimeDetailStore = create<AnimeDetailStore>()(
  maybeDevtools(
    (set, get) => {
      const fetchOne = async (id: number) => {
        try {
          const response = await emitWithErrorHandling<
            { anilistId: number },
            { anime: AnimeDetail }
          >(AnimeEvents.GET_DETAILS, { anilistId: id });
          set(
            state => {
              const nextDetails = new Map(state.details);
              nextDetails.set(id, response.anime);
              const nextInFlight = new Set(state.inFlight);
              nextInFlight.delete(id);
              const nextFailed = new Set(state.failed);
              nextFailed.delete(id);
              return { details: nextDetails, inFlight: nextInFlight, failed: nextFailed };
            },
            undefined,
            'animeDetail/fetched'
          );
        } catch (err) {
          logger.warn(`Failed to fetch details for anilistId ${id}:`, err);
          set(
            state => {
              const nextInFlight = new Set(state.inFlight);
              nextInFlight.delete(id);
              const nextFailed = new Set(state.failed);
              nextFailed.add(id);
              return { inFlight: nextInFlight, failed: nextFailed };
            },
            undefined,
            'animeDetail/fetchError'
          );
        }
      };

      return {
        details: new Map(),
        inFlight: new Set(),
        failed: new Set(),

        ensureDetails: (ids: readonly number[]) => {
          const { details, inFlight, failed } = get();
          const toFetch: number[] = [];
          for (const id of ids) {
            if (!id || id <= 0) continue;
            if (details.has(id) || inFlight.has(id) || failed.has(id)) continue;
            toFetch.push(id);
          }
          if (toFetch.length === 0) return;

          set(
            state => {
              const nextInFlight = new Set(state.inFlight);
              for (const id of toFetch) nextInFlight.add(id);
              return { inFlight: nextInFlight };
            },
            undefined,
            'animeDetail/ensureDetails'
          );

          for (const id of toFetch) {
            void fetchOne(id);
          }
        },

        retry: (id: number) => {
          const { inFlight, details } = get();
          if (details.has(id) || inFlight.has(id)) return;
          set(
            state => {
              const nextFailed = new Set(state.failed);
              nextFailed.delete(id);
              const nextInFlight = new Set(state.inFlight);
              nextInFlight.add(id);
              return { failed: nextFailed, inFlight: nextInFlight };
            },
            undefined,
            'animeDetail/retry'
          );
          void fetchOne(id);
        },

        clear: () => {
          set(
            { details: new Map(), inFlight: new Set(), failed: new Set() },
            undefined,
            'animeDetail/clear'
          );
        },
      };
    },
    { name: 'animeDetail' }
  )
);
