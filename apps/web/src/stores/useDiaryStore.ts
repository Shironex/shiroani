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
  type DiaryEntry,
  type DiaryCreatePayload,
  type DiaryUpdatePayload,
  DiaryEvents,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('DiaryStore');

export type DiaryFilter = 'all' | 'pinned' | 'with_anime';
export type DiarySortBy = 'createdAt' | 'updatedAt' | 'title';

interface DiaryState extends SocketStoreSlice {
  entries: DiaryEntry[];
  activeFilter: DiaryFilter;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: DiarySortBy;
  sortOrder: 'asc' | 'desc';
  selectedEntry: DiaryEntry | null;
  isEditorOpen: boolean;
}

interface DiaryActions {
  fetchEntries: () => void;
  createEntry: (payload: DiaryCreatePayload) => void;
  updateEntry: (payload: DiaryUpdatePayload) => void;
  removeEntry: (id: number) => void;
  setFilter: (filter: DiaryFilter) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSort: (sortBy: DiarySortBy, sortOrder: 'asc' | 'desc') => void;
  openEditor: (entry?: DiaryEntry) => void;
  closeEditor: () => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type DiaryStore = DiaryState & DiaryActions;

export const useDiaryStore = create<DiaryStore>()(
  maybeDevtools(
    (set, get) => {
      const socketActions = createSocketActions<DiaryStore>(set, 'diary');

      const { initListeners, cleanupListeners } = createSocketListeners<DiaryStore>(
        get,
        set,
        'diary',
        {
          listeners: [
            {
              event: DiaryEvents.RESULT,
              handler: data => {
                const entries = data as DiaryEntry[];
                set({ entries, isLoading: false }, undefined, 'diary/result');
              },
            },
            {
              event: DiaryEvents.UPDATED,
              handler: data => {
                const { action } = data as { action: string };
                if (action === 'created') {
                  const { entry } = data as { entry: DiaryEntry; action: string };
                  set(
                    state => ({ entries: [entry, ...state.entries] }),
                    undefined,
                    'diary/entryCreated'
                  );
                } else if (action === 'updated') {
                  const { entry } = data as { entry: DiaryEntry; action: string };
                  set(
                    state => ({
                      entries: state.entries.map(e => (e.id === entry.id ? entry : e)),
                      selectedEntry:
                        state.selectedEntry?.id === entry.id ? entry : state.selectedEntry,
                    }),
                    undefined,
                    'diary/entryUpdated'
                  );
                } else if (action === 'removed') {
                  const { id } = data as { id: number; action: string };
                  set(
                    state => ({
                      entries: state.entries.filter(e => e.id !== id),
                      selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
                      isEditorOpen: state.selectedEntry?.id === id ? false : state.isEditorOpen,
                    }),
                    undefined,
                    'diary/entryRemoved'
                  );
                } else if (action === 'imported') {
                  get().fetchEntries();
                }
              },
            },
          ],
          onConnect: () => {
            get().fetchEntries();
          },
        }
      );

      return {
        ...initialSocketState,
        entries: [],
        activeFilter: 'all',
        searchQuery: '',
        viewMode: 'grid',
        sortBy: 'createdAt' as DiarySortBy,
        sortOrder: 'desc' as const,
        selectedEntry: null,
        isEditorOpen: false,

        ...socketActions,

        fetchEntries: () => {
          set({ isLoading: true }, undefined, 'diary/fetching');
          emitWithErrorHandling<Record<string, never>, { entries: DiaryEntry[] }>(
            DiaryEvents.GET_ALL,
            {}
          )
            .then(data => {
              set(
                { entries: data.entries ?? [], isLoading: false, error: null },
                undefined,
                'diary/result'
              );
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch diary entries:', err.message);
              set({ isLoading: false, error: err.message }, undefined, 'diary/fetchError');
            });
        },

        createEntry: (payload: DiaryCreatePayload) => {
          emitWithErrorHandling(DiaryEvents.CREATE, payload)
            .then(() => {
              get().fetchEntries();
            })
            .catch((err: Error) => {
              logger.error('Failed to create diary entry:', err.message);
              set({ error: err.message }, undefined, 'diary/createError');
            });
        },

        updateEntry: (payload: DiaryUpdatePayload) => {
          const { id, ...rest } = payload;
          // Strip null values to undefined for DiaryEntry compatibility
          const optimistic: Partial<DiaryEntry> = {};
          for (const [key, value] of Object.entries(rest)) {
            (optimistic as Record<string, unknown>)[key] = value === null ? undefined : value;
          }
          // Optimistic update
          set(
            state => ({
              entries: state.entries.map(e =>
                e.id === id ? { ...e, ...optimistic, isPinned: rest.isPinned ?? e.isPinned } : e
              ),
            }),
            undefined,
            'diary/optimisticUpdate'
          );
          emitWithErrorHandling(DiaryEvents.UPDATE, payload).catch((err: Error) => {
            logger.error('Failed to update diary entry:', err.message);
            get().fetchEntries();
          });
        },

        removeEntry: (id: number) => {
          const previousEntries = get().entries;
          set(
            state => ({
              entries: state.entries.filter(e => e.id !== id),
              isEditorOpen: state.selectedEntry?.id === id ? false : state.isEditorOpen,
              selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
            }),
            undefined,
            'diary/optimisticRemove'
          );
          emitWithErrorHandling(DiaryEvents.REMOVE, { id }).catch((err: Error) => {
            logger.error('Failed to remove diary entry:', err.message);
            set({ entries: previousEntries }, undefined, 'diary/removeError');
          });
        },

        setFilter: (filter: DiaryFilter) => {
          set({ activeFilter: filter }, undefined, 'diary/setFilter');
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query }, undefined, 'diary/setSearchQuery');
        },

        setViewMode: (mode: 'grid' | 'list') => {
          set({ viewMode: mode }, undefined, 'diary/setViewMode');
        },

        setSort: (sortBy: DiarySortBy, sortOrder: 'asc' | 'desc') => {
          set({ sortBy, sortOrder }, undefined, 'diary/setSort');
        },

        openEditor: (entry?: DiaryEntry) => {
          set({ selectedEntry: entry ?? null, isEditorOpen: true }, undefined, 'diary/openEditor');
        },

        closeEditor: () => {
          set({ isEditorOpen: false, selectedEntry: null }, undefined, 'diary/closeEditor');
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'diary' }
  )
);

/**
 * Selector that returns filtered and sorted diary entries. Memoized to return
 * a stable reference when the result is shallowly equal, preventing
 * unnecessary re-renders.
 */
export const getFilteredDiaryEntries = createMemoizedSelector(
  (
    state: Pick<DiaryState, 'entries' | 'activeFilter' | 'searchQuery' | 'sortBy' | 'sortOrder'>
  ): DiaryEntry[] => {
    const { entries, activeFilter, searchQuery, sortBy, sortOrder } = state;

    let filtered = entries;

    if (activeFilter === 'pinned') {
      filtered = filtered.filter(e => e.isPinned);
    } else if (activeFilter === 'with_anime') {
      filtered = filtered.filter(e => e.animeId != null);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.title.toLowerCase().includes(query) ||
          e.animeTitle?.toLowerCase().includes(query) ||
          e.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Pinned first, then by chosen sort field
    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      let cmp = 0;
      switch (sortBy) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }
);
