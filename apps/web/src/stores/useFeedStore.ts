import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import { createFilteredListSelector } from '@/stores/utils/createFilteredListSelector';
import {
  type FeedItem,
  type FeedSource,
  type FeedCategory,
  type FeedLanguage,
  type FeedGetItemsPayload,
  type FeedGetItemsResult,
  type FeedGetSourcesResult,
  type FeedGetArticlePayload,
  type FeedGetArticleResult,
  FeedEvents,
  FEED_STARTUP_REFRESH_SETTING_KEY,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { electronStoreSet } from '@/lib/electron-store';
import { createLocalStorageAccessor } from '@/lib/persisted-storage';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('FeedStore');

const PAGE_SIZE = 30;
const REFRESH_FALLBACK_MS = 35_000;
const MAX_READ_IDS = 5000;

async function isStartupRefreshEnabled(): Promise<boolean> {
  try {
    const value = await window.electronAPI?.store?.get<boolean>(FEED_STARTUP_REFRESH_SETTING_KEY);
    return value === true;
  } catch (error) {
    logger.warn('Failed to read feed startup refresh setting:', error);
    return false;
  }
}

/**
 * Feed store state
 */
interface FeedState extends SocketStoreSlice {
  items: FeedItem[];
  sources: FeedSource[];
  total: number;
  hasMore: boolean;
  categoryFilter: FeedCategory | 'all';
  languageFilter: FeedLanguage | 'all';
  sourceFilter: number | null;
  isRefreshing: boolean;
  isBootstrapping: boolean;
  lastRefreshNewCount: number | null;
  /** Epoch ms of the last time the user opened the Feed view. Items published after this are "unread" from the newtab greeting's perspective. */
  lastVisitedAt: number;
  /** Persistent set of feed item IDs the user has opened in the reader. */
  readIds: Set<number>;
  /**
   * Per-item on-demand article extraction state (Phase 2), keyed by item id.
   * `articleContent` holds successfully extracted HTML; `articleStatus` tracks
   * the in-flight / failed lifecycle so the reader can show a loader or fall
   * back to the teaser + CTA. Session-scoped (not persisted).
   */
  articleContent: Record<number, string>;
  articleStatus: Record<number, 'loading' | 'error'>;
}

/**
 * Feed store actions
 */
interface FeedActions {
  fetchItems: (loadMore?: boolean, options?: { bootstrapIfEmpty?: boolean }) => void;
  fetchSources: () => void;
  refreshFeeds: (options?: { isBootstrap?: boolean }) => void;
  setCategoryFilter: (category: FeedCategory | 'all') => void;
  setLanguageFilter: (language: FeedLanguage | 'all') => void;
  setSourceFilter: (sourceId: number | null) => void;
  toggleSource: (id: number, enabled: boolean) => void;
  /** Stamp `lastVisitedAt` to now — resets the newtab unread count. */
  markAllSeen: () => void;
  /** Persist a single feed item as "read" (idempotent). */
  markRead: (id: number) => void;
  /**
   * Lazily extract the full article body for a teaser-only item (Phase 2).
   * No-op when the item already carries `contentHtml`, when extraction has
   * already succeeded, or while a request is in flight. On failure leaves the
   * status as `'error'` so the reader falls back to the teaser + CTA.
   */
  loadArticleContent: (item: FeedItem) => void;
  /**
   * Mark every currently-loaded feed item as read. Distinct from {@link markAllSeen},
   * which only bumps the newtab greeting's `lastVisitedAt` timestamp — this one
   * permanently flags the items themselves so they stop rendering the "unread" glow.
   */
  markAllRead: () => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

const LAST_VISITED_STORAGE_KEY = 'shiroani:feedLastVisitedAt';
const READ_IDS_STORAGE_KEY = 'shiroani:feedReadIds';

const lastVisitedStorage = createLocalStorageAccessor<number>(LAST_VISITED_STORAGE_KEY, {
  parse: raw => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  },
  serialize: ts => String(ts),
  fallback: 0,
});

const readIdsStorage = createLocalStorageAccessor<Set<number>>(READ_IDS_STORAGE_KEY, {
  parse: raw => {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const ids = new Set<number>();
    for (const v of parsed) {
      if (typeof v === 'number' && Number.isFinite(v)) ids.add(v);
    }
    return ids;
  },
  serialize: ids => JSON.stringify(Array.from(ids)),
  fallback: new Set(),
});

function getPersistedLastVisitedAt(): number {
  return lastVisitedStorage.get();
}

function persistLastVisitedAt(ts: number) {
  lastVisitedStorage.set(ts);
}

function getPersistedReadIds(): Set<number> {
  return readIdsStorage.get();
}

function persistReadIds(ids: Set<number>) {
  readIdsStorage.set(ids);
  // Fire-and-forget mirror to electron-store so main-process consumers can read it.
  void electronStoreSet(READ_IDS_STORAGE_KEY, Array.from(ids)).catch(() => {
    // ignore — localStorage is the primary store
  });
}

type FeedStore = FeedState & FeedActions;

export const useFeedStore = create<FeedStore>()(
  maybeDevtools(
    (set, get) => {
      const socketActions = createSocketActions<FeedStore>(set, 'feed');
      let refreshFallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const clearRefreshFallback = () => {
        if (refreshFallbackTimer) {
          clearTimeout(refreshFallbackTimer);
          refreshFallbackTimer = null;
        }
      };

      const scheduleRefreshFallback = () => {
        clearRefreshFallback();
        refreshFallbackTimer = setTimeout(() => {
          if (!get().isRefreshing) return;

          logger.warn('Feed refresh completion event missing, falling back to a direct fetch');
          set({ isRefreshing: false, isBootstrapping: false }, undefined, 'feed/refreshFallback');
          get().fetchItems();
        }, REFRESH_FALLBACK_MS);
      };

      const { initListeners, cleanupListeners: cleanupSocketListeners } =
        createSocketListeners<FeedStore>(get, set, 'feed', {
          listeners: [
            {
              event: FeedEvents.NEW_ITEMS,
              handler: data => {
                const { newItemsCount } = data as { newItemsCount: number };
                clearRefreshFallback();
                logger.info(`${newItemsCount} new feed items available`);
                set(
                  {
                    isRefreshing: false,
                    isBootstrapping: false,
                    lastRefreshNewCount: newItemsCount,
                  },
                  undefined,
                  'feed/refreshComplete'
                );
                // Re-fetch items to include the new ones
                get().fetchItems();
              },
            },
          ],
          onConnect: () => {
            get().fetchSources();
            void isStartupRefreshEnabled().then(enabled => {
              get().fetchItems(false, { bootstrapIfEmpty: enabled });
            });
          },
        });

      const cleanupListeners = () => {
        clearRefreshFallback();
        cleanupSocketListeners();
      };

      return {
        // State
        ...initialSocketState,
        items: [],
        sources: [],
        total: 0,
        hasMore: false,
        categoryFilter: 'all',
        languageFilter: 'all',
        sourceFilter: null,
        isRefreshing: false,
        isBootstrapping: false,
        lastRefreshNewCount: null,
        lastVisitedAt: getPersistedLastVisitedAt(),
        readIds: getPersistedReadIds(),
        articleContent: {},
        articleStatus: {},

        // Socket actions
        ...socketActions,

        // Actions
        fetchItems: (loadMore?: boolean, options?: { bootstrapIfEmpty?: boolean }) => {
          const { categoryFilter, languageFilter, sourceFilter, items, isLoading } = get();

          // Prevent duplicate requests
          if (isLoading) return;

          const offset = loadMore ? items.length : 0;

          set({ isLoading: true }, undefined, loadMore ? 'feed/loadingMore' : 'feed/fetching');

          const payload: FeedGetItemsPayload = {
            category: categoryFilter,
            language: languageFilter,
            sourceId: sourceFilter ?? undefined,
            limit: PAGE_SIZE,
            offset,
          };

          emitWithErrorHandling<FeedGetItemsPayload, FeedGetItemsResult>(
            FeedEvents.GET_ITEMS,
            payload
          )
            .then(data => {
              if (loadMore) {
                set(
                  state => {
                    // Deduplicate: only append items not already in the list
                    const existingIds = new Set(state.items.map(i => i.id));
                    const newItems = data.items.filter(i => !existingIds.has(i.id));
                    return {
                      items: [...state.items, ...newItems],
                      total: data.total,
                      hasMore: data.hasMore,
                      isLoading: false,
                      error: null,
                    };
                  },
                  undefined,
                  'feed/loadedMore'
                );
              } else {
                const shouldBootstrap =
                  options?.bootstrapIfEmpty === true &&
                  data.items.length === 0 &&
                  categoryFilter === 'all' &&
                  languageFilter === 'all' &&
                  sourceFilter === null;

                set(
                  {
                    items: data.items,
                    total: data.total,
                    hasMore: data.hasMore,
                    isLoading: false,
                    isBootstrapping: shouldBootstrap,
                    error: null,
                  },
                  undefined,
                  'feed/result'
                );

                if (shouldBootstrap) {
                  get().refreshFeeds({ isBootstrap: true });
                }
              }
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch feed items:', err.message);
              set(
                { isLoading: false, isBootstrapping: false, error: err.message },
                undefined,
                'feed/fetchError'
              );
            });
        },

        fetchSources: () => {
          emitWithErrorHandling<Record<string, never>, FeedGetSourcesResult>(
            FeedEvents.GET_SOURCES,
            {}
          )
            .then(data => {
              set({ sources: data.sources ?? [] }, undefined, 'feed/sourcesResult');
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch feed sources:', err.message);
            });
        },

        refreshFeeds: (options?: { isBootstrap?: boolean }) => {
          clearRefreshFallback();
          set(
            {
              isRefreshing: true,
              isBootstrapping: options?.isBootstrap ?? false,
              lastRefreshNewCount: null,
              error: null,
            },
            undefined,
            'feed/refreshing'
          );
          // The backend returns immediately (fire-and-forget) and broadcasts
          // FeedEvents.NEW_ITEMS when done, which the listener above handles.
          emitWithErrorHandling<Record<string, never>, { started: boolean }>(FeedEvents.REFRESH, {})
            .then(() => {
              scheduleRefreshFallback();
            })
            .catch((err: Error) => {
              clearRefreshFallback();
              logger.error('Failed to start feed refresh:', err.message);
              set(
                {
                  isRefreshing: false,
                  isBootstrapping: false,
                  error: err.message,
                },
                undefined,
                'feed/refreshError'
              );
            });
        },

        setCategoryFilter: (category: FeedCategory | 'all') => {
          set(
            { categoryFilter: category, lastRefreshNewCount: null },
            undefined,
            'feed/setCategoryFilter'
          );
          get().fetchItems();
        },

        setLanguageFilter: (language: FeedLanguage | 'all') => {
          set(
            { languageFilter: language, lastRefreshNewCount: null },
            undefined,
            'feed/setLanguageFilter'
          );
          get().fetchItems();
        },

        setSourceFilter: (sourceId: number | null) => {
          set(
            { sourceFilter: sourceId, lastRefreshNewCount: null },
            undefined,
            'feed/setSourceFilter'
          );
          get().fetchItems();
        },

        markAllSeen: () => {
          const now = Date.now();
          if (get().lastVisitedAt === now) return;
          set({ lastVisitedAt: now }, undefined, 'feed/markAllSeen');
          persistLastVisitedAt(now);
        },

        markRead: (id: number) => {
          const current = get().readIds;
          if (current.has(id)) return;

          let next: Set<number>;
          if (current.size >= MAX_READ_IDS) {
            // Drop the oldest entry to stay within the cap.
            const arr = Array.from(current);
            arr.shift();
            arr.push(id);
            next = new Set(arr);
          } else {
            next = new Set(current);
            next.add(id);
          }

          set({ readIds: next }, undefined, 'feed/markRead');
          persistReadIds(next);
        },

        loadArticleContent: (item: FeedItem) => {
          // The feed already shipped a full body, or we have nothing to fetch.
          if (item.contentHtml || !item.url) return;
          // The source opts out of on-demand extraction (SPA/teaser-noisy) —
          // the reader shows the teaser + CTA instead.
          if (!item.sourceSupportsFullContent) return;

          const { articleContent, articleStatus } = get();
          // Already resolved or in flight — don't refetch.
          if (articleContent[item.id] !== undefined) return;
          if (articleStatus[item.id] === 'loading') return;

          set(
            state => ({ articleStatus: { ...state.articleStatus, [item.id]: 'loading' } }),
            undefined,
            'feed/articleLoading'
          );

          emitWithErrorHandling<FeedGetArticlePayload, FeedGetArticleResult>(
            FeedEvents.GET_ARTICLE,
            { url: item.url }
          )
            .then(result => {
              if (result.contentHtml) {
                set(
                  state => {
                    const nextStatus = { ...state.articleStatus };
                    delete nextStatus[item.id];
                    return {
                      articleContent: { ...state.articleContent, [item.id]: result.contentHtml! },
                      articleStatus: nextStatus,
                    };
                  },
                  undefined,
                  'feed/articleReady'
                );
              } else {
                set(
                  state => ({ articleStatus: { ...state.articleStatus, [item.id]: 'error' } }),
                  undefined,
                  'feed/articleEmpty'
                );
              }
            })
            .catch((err: Error) => {
              logger.warn(`Failed to extract article for item ${item.id}:`, err.message);
              set(
                state => ({ articleStatus: { ...state.articleStatus, [item.id]: 'error' } }),
                undefined,
                'feed/articleError'
              );
            });
        },

        markAllRead: () => {
          const { readIds, items } = get();
          if (items.length === 0) return;

          let next = new Set(readIds);
          for (const item of items) next.add(item.id);

          if (next.size === readIds.size) return; // no change

          if (next.size > MAX_READ_IDS) {
            // Truncate oldest entries to stay within cap.
            const arr = Array.from(next);
            next = new Set(arr.slice(arr.length - MAX_READ_IDS));
          }

          set({ readIds: next }, undefined, 'feed/markAllRead');
          persistReadIds(next);
        },

        toggleSource: (id: number, enabled: boolean) => {
          // Optimistic update
          set(
            state => ({
              sources: state.sources.map(s => (s.id === id ? { ...s, enabled } : s)),
            }),
            undefined,
            'feed/toggleSourceOptimistic'
          );

          emitWithErrorHandling(FeedEvents.TOGGLE_SOURCE, { id, enabled }).catch((err: Error) => {
            logger.error('Failed to toggle source:', err.message);
            // Revert on error
            get().fetchSources();
          });
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'feed' }
  )
);

/**
 * Memoized selector that returns items filtered by category, language, and source.
 * Provides instant client-side filtering for cached items while the server
 * re-fetches with the new filters.
 */
type FeedFilterState = Pick<
  FeedState,
  'items' | 'categoryFilter' | 'languageFilter' | 'sourceFilter'
>;

export const getFilteredItems = createFilteredListSelector<FeedItem, FeedFilterState>({
  selectItems: state => state.items,
  matchesFilter: ({ categoryFilter, languageFilter, sourceFilter }) => {
    // When no filter is active, return null so the source array reference is
    // preserved untouched (instant client-side filtering, stable identity).
    if (categoryFilter === 'all' && languageFilter === 'all' && sourceFilter === null) {
      return null;
    }
    return item =>
      (categoryFilter === 'all' || item.sourceCategory === categoryFilter) &&
      (languageFilter === 'all' || item.sourceLanguage === languageFilter) &&
      (sourceFilter === null || item.feedSourceId === sourceFilter);
  },
});
