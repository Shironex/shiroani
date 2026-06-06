import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  AnimeEvents,
  createLogger,
  getCurrentAniListSeason,
  shuffleArray,
  hasActiveDiscoverFilters,
  type DiscoverMedia,
  type DiscoverSort,
  type DiscoverFilters,
  type AniListCommunityRecommendation,
  type RecommendationRating,
  type GetRecommendationsRequest,
  type GetRecommendationsResult,
  type SaveRecommendationRequest,
  type SaveRecommendationResult,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import i18n from '@/lib/i18n';

const logger = createLogger('DiscoverStore');

// ── Types ────────────────────────────────────────────────────────

export type DiscoverTab = 'trending' | 'popular' | 'seasonal' | 'random' | 'recommendations';

// Re-exported so existing consumers can keep importing `DiscoverMedia` from the
// store module unchanged (canonical definition now lives in `@shiroani/shared`).
export type { DiscoverMedia };

interface PageInfo {
  current: number;
  hasNext: boolean;
}

interface PaginatedResponse {
  results: DiscoverMedia[];
  pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
}

// ── State ────────────────────────────────────────────────────────

interface DiscoverState {
  activeTab: DiscoverTab;
  // Browse results per tab
  trending: DiscoverMedia[];
  popular: DiscoverMedia[];
  seasonal: DiscoverMedia[];
  // Pagination per tab
  trendingPage: PageInfo;
  popularPage: PageInfo;
  seasonalPage: PageInfo;
  // Random discovery
  randomPool: DiscoverMedia[];
  randomShuffled: DiscoverMedia[];
  randomIncludedGenres: string[];
  randomExcludedGenres: string[];
  isRandomLoading: boolean;
  // Community recommendations (item C5) — media->media pairings sorted by net
  // community vote. No pagination (30 fixed server-side); browse needs no auth.
  recommendations: AniListCommunityRecommendation[];
  isRecommendationsLoading: boolean;
  // Recommendation-scoped error, kept OUT of the shared `error` slot: the tab
  // caches its results, so an unrelated browse/search failure must not make the
  // (still-valid) recommendations render as failed.
  recommendationsError: string | null;
  // Search
  searchQuery: string;
  searchResults: DiscoverMedia[];
  searchPage: PageInfo;
  isSearching: boolean;
  // Browse sort (item 2) + advanced filters (item 6) — apply to all browse
  // tabs and to search results alike.
  sort: DiscoverSort;
  filters: DiscoverFilters;
  // Hide media already in the user's library by status (item 14).
  excludeLibrary: boolean;
  // General
  isLoading: boolean;
  error: string | null;
}

interface DiscoverActions {
  setTab: (tab: DiscoverTab) => void;
  setSearchQuery: (query: string) => void;
  search: (query: string) => void;
  fetchTrending: () => void;
  fetchPopular: () => void;
  fetchSeasonal: () => void;
  fetchRandomPool: () => void;
  reshuffleRandom: () => void;
  setRandomGenres: (included: string[], excluded: string[]) => void;
  fetchRecommendations: () => void;
  /**
   * Cast / clear a vote on a community recommendation pairing. Optimistically
   * updates the pair's `userRating`, then reconciles with the server ack (or
   * rolls back on failure). Gated on connected by the caller.
   */
  voteRecommendation: (
    pair: AniListCommunityRecommendation,
    rating: RecommendationRating
  ) => Promise<void>;
  setSort: (sort: DiscoverSort) => void;
  setFilters: (filters: DiscoverFilters) => void;
  setExcludeLibrary: (exclude: boolean) => void;
  refetchActive: () => void;
  loadMore: () => void;
  clearSearch: () => void;
}

type DiscoverStore = DiscoverState & DiscoverActions;

const initialPage: PageInfo = { current: 1, hasNext: false };

function toUserError(err: Error): string {
  if (err.message.includes('rate limit') || err.message.includes('429')) {
    return i18n.t('discover:toast.rateLimited');
  }
  return err.message;
}

/**
 * Sort + filters to attach to a browse/search payload. Omits an empty filter
 * object so the backend keeps its pristine cache keys when no filters are set.
 */
function querySortAndFilters(state: DiscoverState): {
  sort: DiscoverSort;
  filters?: DiscoverFilters;
} {
  return {
    sort: state.sort,
    filters: hasActiveDiscoverFilters(state.filters) ? state.filters : undefined,
  };
}

export const useDiscoverStore = create<DiscoverStore>()(
  persist(
    maybeDevtools(
      (set, get) => ({
        // State
        activeTab: 'trending',
        trending: [],
        popular: [],
        seasonal: [],
        trendingPage: { ...initialPage },
        popularPage: { ...initialPage },
        seasonalPage: { ...initialPage },
        randomPool: [],
        randomShuffled: [],
        randomIncludedGenres: [],
        randomExcludedGenres: [],
        isRandomLoading: false,
        recommendations: [],
        isRecommendationsLoading: false,
        recommendationsError: null,
        searchQuery: '',
        searchResults: [],
        searchPage: { ...initialPage },
        isSearching: false,
        sort: 'popularity',
        filters: {},
        excludeLibrary: false,
        isLoading: false,
        error: null,

        // Actions

        setTab: (tab: DiscoverTab) => {
          set({ activeTab: tab }, undefined, 'discover/setTab');

          // Fetch data if tab has no results yet
          const state = get();
          switch (tab) {
            case 'trending':
              if (state.trending.length === 0) state.fetchTrending();
              break;
            case 'popular':
              if (state.popular.length === 0) state.fetchPopular();
              break;
            case 'seasonal':
              if (state.seasonal.length === 0) state.fetchSeasonal();
              break;
            case 'random':
              if (state.randomPool.length === 0) state.fetchRandomPool();
              break;
            case 'recommendations':
              if (state.recommendations.length === 0) state.fetchRecommendations();
              break;
          }
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, undefined, 'discover/setSearchQuery');
        },

        search: (query: string) => {
          if (!query.trim()) return;

          logger.info(`Search: "${query.trim()}" (page 1)`);
          set(
            { isSearching: true, isLoading: true, searchQuery: query, error: null },
            undefined,
            'discover/searching'
          );

          emitWithErrorHandling<
            { query: string; page?: number; sort?: DiscoverSort; filters?: DiscoverFilters },
            PaginatedResponse
          >(AnimeEvents.SEARCH, {
            query: query.trim(),
            page: 1,
            ...querySortAndFilters(get()),
          })
            .then(data => {
              logger.info(
                `Search results: ${data.results.length} items (page ${data.pageInfo.currentPage}/${data.pageInfo.lastPage})`
              );
              set(
                {
                  searchResults: data.results,
                  searchPage: {
                    current: data.pageInfo.currentPage,
                    hasNext: data.pageInfo.hasNextPage,
                  },
                  isLoading: false,
                  isSearching: true,
                  error: null,
                },
                undefined,
                'discover/searchResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Search failed:', err.message);
              set({ isLoading: false, error: toUserError(err) }, undefined, 'discover/searchError');
            });
        },

        fetchTrending: () => {
          logger.info('Fetching trending (page 1)');
          set({ isLoading: true, error: null }, undefined, 'discover/fetchingTrending');

          emitWithErrorHandling<
            { page?: number; sort?: DiscoverSort; filters?: DiscoverFilters },
            PaginatedResponse
          >(AnimeEvents.GET_TRENDING, {
            page: 1,
            ...querySortAndFilters(get()),
          })
            .then(data => {
              logger.info(`Trending: ${data.results.length} items loaded`);
              set(
                {
                  trending: data.results,
                  trendingPage: {
                    current: data.pageInfo.currentPage,
                    hasNext: data.pageInfo.hasNextPage,
                  },
                  isLoading: false,
                  error: null,
                },
                undefined,
                'discover/trendingResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Trending fetch failed:', err.message);
              set(
                { isLoading: false, error: toUserError(err) },
                undefined,
                'discover/trendingError'
              );
            });
        },

        fetchPopular: () => {
          logger.info('Fetching popular (page 1)');
          set({ isLoading: true, error: null }, undefined, 'discover/fetchingPopular');

          emitWithErrorHandling<
            { page?: number; sort?: DiscoverSort; filters?: DiscoverFilters },
            PaginatedResponse
          >(AnimeEvents.GET_POPULAR, {
            page: 1,
            ...querySortAndFilters(get()),
          })
            .then(data => {
              logger.info(`Popular: ${data.results.length} items loaded`);
              set(
                {
                  popular: data.results,
                  popularPage: {
                    current: data.pageInfo.currentPage,
                    hasNext: data.pageInfo.hasNextPage,
                  },
                  isLoading: false,
                  error: null,
                },
                undefined,
                'discover/popularResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Popular fetch failed:', err.message);
              set(
                { isLoading: false, error: toUserError(err) },
                undefined,
                'discover/popularError'
              );
            });
        },

        fetchSeasonal: () => {
          const { year, season } = getCurrentAniListSeason();
          logger.info(`Fetching seasonal: ${season} ${year} (page 1)`);
          set({ isLoading: true, error: null }, undefined, 'discover/fetchingSeasonal');

          emitWithErrorHandling<
            {
              year: number;
              season: string;
              page?: number;
              sort?: DiscoverSort;
              filters?: DiscoverFilters;
            },
            PaginatedResponse
          >(AnimeEvents.GET_SEASONAL, { year, season, page: 1, ...querySortAndFilters(get()) })
            .then(data => {
              logger.info(`Seasonal: ${data.results.length} items loaded`);
              set(
                {
                  seasonal: data.results,
                  seasonalPage: {
                    current: data.pageInfo.currentPage,
                    hasNext: data.pageInfo.hasNextPage,
                  },
                  isLoading: false,
                  error: null,
                },
                undefined,
                'discover/seasonalResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Seasonal fetch failed:', err.message);
              set(
                { isLoading: false, error: toUserError(err) },
                undefined,
                'discover/seasonalError'
              );
            });
        },

        fetchRandomPool: () => {
          const { randomIncludedGenres, randomExcludedGenres } = get();
          logger.info(
            `Fetching random pool — include=[${randomIncludedGenres.join(',')}] exclude=[${randomExcludedGenres.join(',')}]`
          );
          set({ isRandomLoading: true, error: null }, undefined, 'discover/fetchingRandom');

          emitWithErrorHandling<
            { includedGenres?: string[]; excludedGenres?: string[]; perPage?: number },
            PaginatedResponse
          >(AnimeEvents.GET_RANDOM, {
            includedGenres: randomIncludedGenres,
            excludedGenres: randomExcludedGenres,
            perPage: 50,
          })
            .then(data => {
              const pool = data.results;
              const shuffled = shuffleArray(pool);
              logger.info(`Random pool: ${pool.length} items loaded`);
              set(
                {
                  randomPool: pool,
                  randomShuffled: shuffled,
                  isRandomLoading: false,
                  error: null,
                },
                undefined,
                'discover/randomResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Random fetch failed:', err.message);
              set(
                { isRandomLoading: false, error: toUserError(err) },
                undefined,
                'discover/randomError'
              );
            });
        },

        reshuffleRandom: () => {
          const { randomPool } = get();
          if (randomPool.length === 0) return;
          set({ randomShuffled: shuffleArray(randomPool) }, undefined, 'discover/reshuffleRandom');
        },

        setRandomGenres: (included: string[], excluded: string[]) => {
          const current = get();
          const sameInc =
            included.length === current.randomIncludedGenres.length &&
            included.every(g => current.randomIncludedGenres.includes(g));
          const sameExc =
            excluded.length === current.randomExcludedGenres.length &&
            excluded.every(g => current.randomExcludedGenres.includes(g));
          if (sameInc && sameExc) return;

          set(
            {
              randomIncludedGenres: included,
              randomExcludedGenres: excluded,
              randomPool: [],
              randomShuffled: [],
            },
            undefined,
            'discover/setRandomGenres'
          );
          get().fetchRandomPool();
        },

        fetchRecommendations: () => {
          logger.info('Fetching community recommendations');
          set(
            { isRecommendationsLoading: true, recommendationsError: null },
            undefined,
            'discover/fetchingRecs'
          );

          emitWithErrorHandling<GetRecommendationsRequest, GetRecommendationsResult>(
            AnimeEvents.GET_RECOMMENDATIONS,
            {}
          )
            .then(data => {
              logger.info(`Recommendations: ${data.recommendations.length} pairs loaded`);
              set(
                {
                  recommendations: data.recommendations,
                  isRecommendationsLoading: false,
                  recommendationsError: null,
                },
                undefined,
                'discover/recsResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Recommendations fetch failed:', err.message);
              set(
                { isRecommendationsLoading: false, recommendationsError: toUserError(err) },
                undefined,
                'discover/recsError'
              );
            });
        },

        voteRecommendation: async (pair, rating) => {
          // Toggle off when re-voting the same direction (AniList clears it).
          const next: RecommendationRating = pair.userRating === rating ? 'NO_RATING' : rating;
          const previous = pair.userRating;

          // Optimistic update — swap the matching pair's userRating in place.
          const applyRating = (value: RecommendationRating) =>
            set(
              s => ({
                recommendations: s.recommendations.map(r =>
                  r.id === pair.id ? { ...r, userRating: value } : r
                ),
              }),
              undefined,
              'discover/voteOptimistic'
            );
          applyRating(next);

          try {
            const res = await emitWithErrorHandling<
              SaveRecommendationRequest,
              SaveRecommendationResult
            >(AnimeEvents.SAVE_RECOMMENDATION, {
              mediaId: pair.media.id,
              mediaRecommendationId: pair.mediaRecommendation.id,
              rating: next,
            });
            // Reconcile with the server's resulting vote; null = not connected.
            applyRating(res.userRating ?? previous);
          } catch (err) {
            logger.error('Recommendation vote failed:', (err as Error).message);
            applyRating(previous);
            throw err;
          }
        },

        setSort: (sort: DiscoverSort) => {
          if (get().sort === sort) return;
          set({ sort }, undefined, 'discover/setSort');
          get().refetchActive();
        },

        setFilters: (filters: DiscoverFilters) => {
          set({ filters }, undefined, 'discover/setFilters');
          get().refetchActive();
        },

        setExcludeLibrary: (exclude: boolean) => {
          // Pure client-side post-filter — no refetch needed; consumers read the
          // flag and drop library members from the rendered list.
          set({ excludeLibrary: exclude }, undefined, 'discover/setExcludeLibrary');
        },

        /**
         * Re-run the active view after a sort/filter change. Clears cached browse
         * results so the new params take effect, then refetches the current tab
         * (or re-runs the active search).
         */
        refetchActive: () => {
          const state = get();
          set(
            {
              trending: [],
              popular: [],
              seasonal: [],
              trendingPage: { ...initialPage },
              popularPage: { ...initialPage },
              seasonalPage: { ...initialPage },
            },
            undefined,
            'discover/refetchActive'
          );

          if (state.isSearching && state.searchQuery.trim()) {
            state.search(state.searchQuery.trim());
            return;
          }

          switch (state.activeTab) {
            case 'trending':
              state.fetchTrending();
              break;
            case 'popular':
              state.fetchPopular();
              break;
            case 'seasonal':
              state.fetchSeasonal();
              break;
          }
        },

        loadMore: () => {
          const state = get();
          if (state.isLoading) return;

          // If searching, load more search results
          if (state.isSearching && state.searchQuery.trim()) {
            if (!state.searchPage.hasNext) return;

            const nextPage = state.searchPage.current + 1;
            logger.info(`Search load more: "${state.searchQuery.trim()}" (page ${nextPage})`);
            set({ isLoading: true, error: null }, undefined, 'discover/loadMoreSearch');

            emitWithErrorHandling<
              { query: string; page?: number; sort?: DiscoverSort; filters?: DiscoverFilters },
              PaginatedResponse
            >(AnimeEvents.SEARCH, {
              query: state.searchQuery.trim(),
              page: nextPage,
              ...querySortAndFilters(state),
            })
              .then(data => {
                set(
                  s => ({
                    searchResults: [...s.searchResults, ...data.results],
                    searchPage: {
                      current: data.pageInfo.currentPage,
                      hasNext: data.pageInfo.hasNextPage,
                    },
                    isLoading: false,
                    error: null,
                  }),
                  undefined,
                  'discover/loadMoreSearchResult'
                );
              })
              .catch((err: Error) => {
                logger.error('Search load more failed:', err.message);
                set(
                  { isLoading: false, error: toUserError(err) },
                  undefined,
                  'discover/loadMoreSearchError'
                );
              });
            return;
          }

          // Load more for current tab — random and recommendations tabs have no
          // pagination.
          const { activeTab } = state;
          if (activeTab === 'random' || activeTab === 'recommendations') return;

          const pageKey = `${activeTab}Page` as const;
          const pageInfo = state[pageKey];

          if (!pageInfo.hasNext) return;

          const nextPage = pageInfo.current + 1;
          logger.info(`Load more ${activeTab} (page ${nextPage})`);
          set({ isLoading: true, error: null }, undefined, `discover/loadMore-${activeTab}`);

          let event: string;
          let payload: Record<string, unknown>;
          const sortAndFilters = querySortAndFilters(state);

          switch (activeTab) {
            case 'trending':
              event = AnimeEvents.GET_TRENDING;
              payload = { page: nextPage, ...sortAndFilters };
              break;
            case 'popular':
              event = AnimeEvents.GET_POPULAR;
              payload = { page: nextPage, ...sortAndFilters };
              break;
            case 'seasonal': {
              const { year, season } = getCurrentAniListSeason();
              event = AnimeEvents.GET_SEASONAL;
              payload = { year, season, page: nextPage, ...sortAndFilters };
              break;
            }
            default:
              return;
          }

          const tabKey = activeTab as 'trending' | 'popular' | 'seasonal';
          emitWithErrorHandling<Record<string, unknown>, PaginatedResponse>(event, payload)
            .then(data => {
              set(
                s => ({
                  [tabKey]: [...s[tabKey], ...data.results],
                  [pageKey]: {
                    current: data.pageInfo.currentPage,
                    hasNext: data.pageInfo.hasNextPage,
                  },
                  isLoading: false,
                  error: null,
                }),
                undefined,
                `discover/loadMore-${activeTab}-result`
              );
            })
            .catch((err: Error) => {
              logger.error(`Load more ${activeTab} failed:`, err.message);
              set(
                { isLoading: false, error: toUserError(err) },
                undefined,
                `discover/loadMore-${activeTab}-error`
              );
            });
        },

        clearSearch: () => {
          set(
            {
              searchQuery: '',
              searchResults: [],
              searchPage: { ...initialPage },
              isSearching: false,
              error: null,
            },
            undefined,
            'discover/clearSearch'
          );
        },
      }),
      { name: 'discover' }
    ),
    {
      name: 'discover-prefs',
      storage: createJSONStorage(() => localStorage),
      // Only the user's sort + filter preferences survive reloads (item 2);
      // fetched media and transient flags are intentionally not persisted.
      partialize: state => ({
        sort: state.sort,
        filters: state.filters,
        excludeLibrary: state.excludeLibrary,
      }),
    }
  )
);
