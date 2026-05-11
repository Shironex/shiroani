import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import { createMemoizedSelector } from '@/stores/utils/createMemoizedSelector';
import {
  type AnimeEntry,
  type AnimeStatus,
  type LibraryAddPayload,
  type LibraryUpdatePayload,
  LibraryEvents,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('LibraryStore');

/**
 * Library store state
 */
interface LibraryState extends SocketStoreSlice {
  entries: AnimeEntry[];
  activeFilter: AnimeStatus | 'all';
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'title' | 'score' | 'progress' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  selectedEntry: AnimeEntry | null;
  isDetailOpen: boolean;
}

/**
 * Library store actions
 */
interface LibraryActions {
  fetchLibrary: () => void;
  addToLibrary: (payload: LibraryAddPayload) => void;
  updateEntry: (payload: LibraryUpdatePayload) => void;
  removeFromLibrary: (id: number) => void;
  setFilter: (filter: AnimeStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSort: (
    sortBy: 'title' | 'score' | 'progress' | 'updatedAt',
    sortOrder: 'asc' | 'desc'
  ) => void;
  selectEntry: (entry: AnimeEntry | null) => void;
  openDetail: (entry: AnimeEntry) => void;
  closeDetail: () => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type LibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<LibraryStore>()(
  maybeDevtools(
    (set, get) => {
      const socketActions = createSocketActions<LibraryStore>(set, 'library');

      const { initListeners, cleanupListeners } = createSocketListeners<LibraryStore>(
        get,
        set,
        'library',
        {
          listeners: [
            {
              event: LibraryEvents.RESULT,
              handler: data => {
                const entries = data as AnimeEntry[];
                set({ entries, isLoading: false }, undefined, 'library/result');
              },
            },
            {
              event: LibraryEvents.UPDATED,
              handler: data => {
                const { action } = data as { action: string };
                if (action === 'added') {
                  const { entry } = data as { entry: AnimeEntry; action: string };
                  set(
                    state => ({ entries: [...state.entries, entry] }),
                    undefined,
                    'library/entryAdded'
                  );
                } else if (action === 'updated') {
                  const { entry } = data as { entry: AnimeEntry; action: string };
                  set(
                    state => ({
                      entries: state.entries.map(e => (e.id === entry.id ? entry : e)),
                    }),
                    undefined,
                    'library/entryUpdated'
                  );
                } else if (action === 'removed') {
                  const { id } = data as { id: number; action: string };
                  set(
                    state => ({ entries: state.entries.filter(e => e.id !== id) }),
                    undefined,
                    'library/entryRemoved'
                  );
                } else if (action === 'imported') {
                  get().fetchLibrary();
                }
              },
            },
          ],
          onConnect: () => {
            get().fetchLibrary();
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        entries: [],
        activeFilter: 'all',
        searchQuery: '',
        viewMode: 'grid',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        selectedEntry: null,
        isDetailOpen: false,

        // Socket actions
        ...socketActions,

        // Actions
        fetchLibrary: () => {
          set({ isLoading: true }, undefined, 'library/fetching');
          emitWithErrorHandling<Record<string, never>, { entries: AnimeEntry[] }>(
            LibraryEvents.GET_ALL,
            {}
          )
            .then(data => {
              set(
                { entries: data.entries ?? [], isLoading: false, error: null },
                undefined,
                'library/result'
              );
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch library:', err.message);
              set({ isLoading: false, error: err.message }, undefined, 'library/fetchError');
            });
        },

        addToLibrary: (payload: LibraryAddPayload) => {
          emitWithErrorHandling(LibraryEvents.ADD, payload)
            .then(() => {
              // Refetch library to include the new entry
              get().fetchLibrary();
            })
            .catch((err: Error) => {
              logger.error('Failed to add to library:', err.message);
              set({ error: err.message }, undefined, 'library/addError');
            });
        },

        updateEntry: (payload: LibraryUpdatePayload) => {
          // Optimistic update — normalize null anilistId to undefined for AnimeEntry compat
          const { anilistId, ...rest } = payload;
          const optimistic = {
            ...rest,
            ...(anilistId !== undefined ? { anilistId: anilistId ?? undefined } : {}),
          };
          set(
            state => ({
              entries: state.entries.map(e => (e.id === payload.id ? { ...e, ...optimistic } : e)),
            }),
            undefined,
            'library/optimisticUpdate'
          );
          emitWithErrorHandling(LibraryEvents.UPDATE, payload).catch((err: Error) => {
            logger.error('Failed to update entry:', err.message);
            // Re-fetch on error to restore correct state
            get().fetchLibrary();
          });
        },

        removeFromLibrary: (id: number) => {
          const previousEntries = get().entries;
          // Optimistic removal
          set(
            state => ({
              entries: state.entries.filter(e => e.id !== id),
              isDetailOpen: false,
              selectedEntry: null,
            }),
            undefined,
            'library/optimisticRemove'
          );
          emitWithErrorHandling(LibraryEvents.REMOVE, { id }).catch((err: Error) => {
            logger.error('Failed to remove from library:', err.message);
            // Restore on error
            set({ entries: previousEntries }, undefined, 'library/removeError');
          });
        },

        setFilter: (filter: AnimeStatus | 'all') => {
          set({ activeFilter: filter }, undefined, 'library/setFilter');
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, undefined, 'library/setSearchQuery');
        },

        setViewMode: (mode: 'grid' | 'list') => {
          set({ viewMode: mode }, undefined, 'library/setViewMode');
        },

        setSort: (
          sortBy: 'title' | 'score' | 'progress' | 'updatedAt',
          sortOrder: 'asc' | 'desc'
        ) => {
          set({ sortBy, sortOrder }, undefined, 'library/setSort');
        },

        selectEntry: (entry: AnimeEntry | null) => {
          set({ selectedEntry: entry }, undefined, 'library/selectEntry');
        },

        openDetail: (entry: AnimeEntry) => {
          set({ selectedEntry: entry, isDetailOpen: true }, undefined, 'library/openDetail');
        },

        closeDetail: () => {
          set({ isDetailOpen: false, selectedEntry: null }, undefined, 'library/closeDetail');
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'library' }
  )
);

/**
 * Selector that returns filtered and sorted library entries based on current
 * filter, search query, and sort settings. Memoized to return a stable
 * reference when the result is shallowly equal, preventing unnecessary
 * re-renders.
 *
 * Use with: useLibraryStore(getFilteredEntries)
 */
export const getFilteredEntries = createMemoizedSelector(
  (
    state: Pick<LibraryState, 'entries' | 'activeFilter' | 'searchQuery' | 'sortBy' | 'sortOrder'>
  ): AnimeEntry[] => {
    const { entries, activeFilter, searchQuery, sortBy, sortOrder } = state;

    let filtered = entries;

    // Filter by status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(e => e.status === activeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.title.toLowerCase().includes(query) ||
          e.titleRomaji?.toLowerCase().includes(query) ||
          e.titleNative?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'score':
          cmp = (a.score ?? 0) - (b.score ?? 0);
          break;
        case 'progress':
          cmp = a.currentEpisode - b.currentEpisode;
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }
);
