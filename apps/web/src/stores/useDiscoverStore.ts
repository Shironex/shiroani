import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  AnimeEvents,
  createLogger,
  getCurrentAniListSeason,
  shuffleArray,
  type DiscoverMedia,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import i18n from '@/lib/i18n';

const logger = createLogger('DiscoverStore');

// ── Types ────────────────────────────────────────────────────────

export type DiscoverTab = 'trending' | 'popular' | 'seasonal' | 'random';

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
  // Search
  searchQuery: string;
  searchResults: DiscoverMedia[];
  searchPage: PageInfo;
  isSearching: boolean;
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

export const useDiscoverStore = create<DiscoverStore>()(
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
      searchQuery: '',
      searchResults: [],
      searchPage: { ...initialPage },
      isSearching: false,
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

        emitWithErrorHandling<{ query: string; page?: number }, PaginatedResponse>(
          AnimeEvents.SEARCH,
          { query: query.trim(), page: 1 }
        )
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

        emitWithErrorHandling<{ page?: number }, PaginatedResponse>(AnimeEvents.GET_TRENDING, {
          page: 1,
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
            set({ isLoading: false, error: toUserError(err) }, undefined, 'discover/trendingError');
          });
      },

      fetchPopular: () => {
        logger.info('Fetching popular (page 1)');
        set({ isLoading: true, error: null }, undefined, 'discover/fetchingPopular');

        emitWithErrorHandling<{ page?: number }, PaginatedResponse>(AnimeEvents.GET_POPULAR, {
          page: 1,
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
            set({ isLoading: false, error: toUserError(err) }, undefined, 'discover/popularError');
          });
      },

      fetchSeasonal: () => {
        const { year, season } = getCurrentAniListSeason();
        logger.info(`Fetching seasonal: ${season} ${year} (page 1)`);
        set({ isLoading: true, error: null }, undefined, 'discover/fetchingSeasonal');

        emitWithErrorHandling<{ year: number; season: string; page?: number }, PaginatedResponse>(
          AnimeEvents.GET_SEASONAL,
          { year, season, page: 1 }
        )
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
            set({ isLoading: false, error: toUserError(err) }, undefined, 'discover/seasonalError');
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

      loadMore: () => {
        const state = get();
        if (state.isLoading) return;

        // If searching, load more search results
        if (state.isSearching && state.searchQuery.trim()) {
          if (!state.searchPage.hasNext) return;

          const nextPage = state.searchPage.current + 1;
          logger.info(`Search load more: "${state.searchQuery.trim()}" (page ${nextPage})`);
          set({ isLoading: true, error: null }, undefined, 'discover/loadMoreSearch');

          emitWithErrorHandling<{ query: string; page?: number }, PaginatedResponse>(
            AnimeEvents.SEARCH,
            { query: state.searchQuery.trim(), page: nextPage }
          )
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

        // Load more for current tab — random tab has no pagination
        const { activeTab } = state;
        if (activeTab === 'random') return;

        const pageKey = `${activeTab}Page` as const;
        const pageInfo = state[pageKey];

        if (!pageInfo.hasNext) return;

        const nextPage = pageInfo.current + 1;
        logger.info(`Load more ${activeTab} (page ${nextPage})`);
        set({ isLoading: true, error: null }, undefined, `discover/loadMore-${activeTab}`);

        let event: string;
        let payload: Record<string, unknown>;

        switch (activeTab) {
          case 'trending':
            event = AnimeEvents.GET_TRENDING;
            payload = { page: nextPage };
            break;
          case 'popular':
            event = AnimeEvents.GET_POPULAR;
            payload = { page: nextPage };
            break;
          case 'seasonal': {
            const { year, season } = getCurrentAniListSeason();
            event = AnimeEvents.GET_SEASONAL;
            payload = { year, season, page: nextPage };
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
  )
);
