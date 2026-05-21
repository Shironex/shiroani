import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import { createFilteredListSelector } from '@/stores/utils/createFilteredListSelector';
import { createCrudResource } from '@/stores/utils/createCrudResource';
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

      const crud = createCrudResource<DiaryEntry, DiaryStore>({
        set,
        get,
        storeName: 'diary',
        logger,
        events: { getAll: DiaryEvents.GET_ALL },
      });

      const onDiaryUpdated = crud.createUpdatedListener({
        addActions: ['created'],
        addedLabel: 'entryCreated',
        onAdded: (state, entry) => ({ entries: [entry, ...state.entries] }),
        onUpdated: (state, entry) => ({
          entries: state.entries.map(e => (e.id === entry.id ? entry : e)),
          selectedEntry: state.selectedEntry?.id === entry.id ? entry : state.selectedEntry,
        }),
        onRemoved: (state, id) => ({
          entries: state.entries.filter(e => e.id !== id),
          selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
          isEditorOpen: state.selectedEntry?.id === id ? false : state.isEditorOpen,
        }),
      });

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
              handler: onDiaryUpdated,
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
          crud.fetchAll();
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
          crud.optimisticUpdate({
            event: DiaryEvents.UPDATE,
            payload,
            id: payload.id,
            applyUpdate: (existing, p) => {
              const { id: _id, ...rest } = p;
              // Strip null values to undefined for DiaryEntry compatibility
              const optimistic: Partial<DiaryEntry> = {};
              for (const [key, value] of Object.entries(rest)) {
                (optimistic as Record<string, unknown>)[key] = value === null ? undefined : value;
              }
              return { ...existing, ...optimistic, isPinned: rest.isPinned ?? existing.isPinned };
            },
          });
        },

        removeEntry: (id: number) => {
          crud.optimisticRemove({
            event: DiaryEvents.REMOVE,
            id,
            extra: state => ({
              isEditorOpen: state.selectedEntry?.id === id ? false : state.isEditorOpen,
              selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
            }),
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
type DiaryFilterState = Pick<
  DiaryState,
  'entries' | 'activeFilter' | 'searchQuery' | 'sortBy' | 'sortOrder'
>;

export const getFilteredDiaryEntries = createFilteredListSelector<DiaryEntry, DiaryFilterState>({
  selectItems: state => state.entries,
  matchesFilter: ({ activeFilter }) => {
    if (activeFilter === 'pinned') return e => e.isPinned;
    if (activeFilter === 'with_anime') return e => e.animeId != null;
    return null;
  },
  matchesSearch: ({ searchQuery }) => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return e =>
      e.title.toLowerCase().includes(query) ||
      (e.animeTitle?.toLowerCase().includes(query) ?? false) ||
      (e.tags?.some(t => t.toLowerCase().includes(query)) ?? false);
  },
  // Pinned first, then by chosen sort field.
  comparator:
    ({ sortBy, sortOrder }) =>
    (a, b) => {
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
    },
});
