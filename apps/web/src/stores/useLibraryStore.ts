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
  type AnimeEntry,
  type AnimeStatus,
  type LibraryAddPayload,
  type LibraryUpdatePayload,
  LibraryEvents,
  CrudActions,
  createLogger,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';

const logger = createLogger('LibraryStore');

/**
 * Merge a {@link LibraryUpdatePayload} onto an existing entry, normalizing the
 * nullable `anilistId` to `undefined` for {@link AnimeEntry} compatibility.
 * Shared by both the single-entry `updateEntry` and the batch mutations so the
 * optimistic patch semantics stay identical.
 */
function applyLibraryUpdate(existing: AnimeEntry, payload: LibraryUpdatePayload): AnimeEntry {
  const { anilistId, ...rest } = payload;
  return {
    ...existing,
    ...rest,
    ...(anilistId !== undefined ? { anilistId: anilistId ?? undefined } : {}),
  };
}

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
  /** Whether multi-select mode is active (shows checkboxes + batch action bar). */
  selectionMode: boolean;
  /** Ids of entries currently selected for a batch operation. */
  selectedIds: Set<number>;
}

/**
 * Library store actions
 */
interface LibraryActions {
  fetchLibrary: () => void;
  /** Resolves `true` when the entry was added, `false` on failure (caller surfaces UX). */
  addToLibrary: (payload: LibraryAddPayload) => Promise<boolean>;
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
  // --- Bulk selection ---
  /** Enter/exit multi-select mode. Exiting clears the current selection. */
  setSelectionMode: (active: boolean) => void;
  /** Toggle a single entry's membership in the selection (also enters selection mode). */
  toggleSelected: (id: number) => void;
  /** Replace the selection with the given ids (e.g. "select all visible"). */
  setSelected: (ids: number[]) => void;
  /** Clear the current selection without leaving selection mode. */
  clearSelection: () => void;
  /** Optimistically change status for every selected entry. */
  batchUpdateStatus: (status: AnimeStatus) => void;
  /** Optimistically set/clear score for every selected entry (0 clears). */
  batchUpdateScore: (score: number) => void;
  /** Optimistically remove every selected entry. */
  batchRemove: () => void;
  initListeners: () => void;
  cleanupListeners: () => void;
}

type LibraryStore = LibraryState & LibraryActions;

export const useLibraryStore = create<LibraryStore>()(
  maybeDevtools(
    (set, get) => {
      const socketActions = createSocketActions<LibraryStore>(set, 'library');

      const crud = createCrudResource<AnimeEntry, LibraryStore>({
        set,
        get,
        storeName: 'library',
        logger,
        events: { getAll: LibraryEvents.GET_ALL },
      });

      const onLibraryUpdated = crud.createUpdatedListener({
        addActions: [CrudActions.ADDED],
        onAdded: (state, entry) => ({ entries: [...state.entries, entry] }),
        onUpdated: (state, entry) => ({
          entries: state.entries.map(e => (e.id === entry.id ? entry : e)),
        }),
        onRemoved: (state, id) => {
          if (!state.selectedIds.has(id)) {
            return { entries: state.entries.filter(e => e.id !== id) };
          }
          const nextSelected = new Set(state.selectedIds);
          nextSelected.delete(id);
          return {
            entries: state.entries.filter(e => e.id !== id),
            selectedIds: nextSelected,
          };
        },
      });

      const { initListeners, cleanupListeners } = createSocketListeners<LibraryStore>(
        get,
        set,
        'library',
        {
          listeners: [
            {
              event: LibraryEvents.UPDATED,
              handler: onLibraryUpdated,
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
        selectionMode: false,
        selectedIds: new Set<number>(),

        // Socket actions
        ...socketActions,

        // Actions
        fetchLibrary: () => {
          crud.fetchAll();
        },

        addToLibrary: (payload: LibraryAddPayload) => {
          // Returns the outcome so the caller (dialog / discover hook) can gate
          // its success toast + dialog-close on the real result instead of
          // assuming success on a fire-and-forget emit.
          return emitWithErrorHandling(LibraryEvents.ADD, payload)
            .then(() => {
              // Refetch library to include the new entry
              get().fetchLibrary();
              return true;
            })
            .catch((err: Error) => {
              logger.error('Failed to add to library:', err.message);
              set({ error: err.message }, undefined, 'library/addError');
              return false;
            });
        },

        updateEntry: (payload: LibraryUpdatePayload) => {
          crud.optimisticUpdate({
            event: LibraryEvents.UPDATE,
            payload,
            id: payload.id,
            applyUpdate: applyLibraryUpdate,
          });
        },

        removeFromLibrary: (id: number) => {
          crud.optimisticRemove({
            event: LibraryEvents.REMOVE,
            id,
            extra: () => ({ isDetailOpen: false, selectedEntry: null }),
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

        setSelectionMode: (active: boolean) => {
          set(
            active
              ? { selectionMode: true }
              : { selectionMode: false, selectedIds: new Set<number>() },
            undefined,
            'library/setSelectionMode'
          );
        },

        toggleSelected: (id: number) => {
          set(
            state => {
              const next = new Set(state.selectedIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return { selectedIds: next, selectionMode: true };
            },
            undefined,
            'library/toggleSelected'
          );
        },

        setSelected: (ids: number[]) => {
          set({ selectedIds: new Set(ids) }, undefined, 'library/setSelected');
        },

        clearSelection: () => {
          set({ selectedIds: new Set<number>() }, undefined, 'library/clearSelection');
        },

        batchUpdateStatus: (status: AnimeStatus) => {
          const ids = [...get().selectedIds];
          for (const id of ids) {
            crud.optimisticUpdate({
              event: LibraryEvents.UPDATE,
              payload: { id, status },
              id,
              applyUpdate: applyLibraryUpdate,
              label: 'batchUpdateStatus',
            });
          }
        },

        batchUpdateScore: (score: number) => {
          const ids = [...get().selectedIds];
          // A score of 0 clears the rating; emit `undefined` so the backend drops it,
          // matching the single-entry editor's `score > 0 ? score : undefined`.
          const nextScore = score > 0 ? score : undefined;
          for (const id of ids) {
            crud.optimisticUpdate({
              event: LibraryEvents.UPDATE,
              payload: { id, score: nextScore },
              id,
              applyUpdate: applyLibraryUpdate,
              label: 'batchUpdateScore',
            });
          }
        },

        batchRemove: () => {
          const ids = [...get().selectedIds];
          for (const id of ids) {
            crud.optimisticRemove({
              event: LibraryEvents.REMOVE,
              id,
              extra: state =>
                state.selectedEntry?.id === id
                  ? { isDetailOpen: false, selectedEntry: null }
                  : {},
              label: 'batchRemove',
            });
          }
          set(
            { selectedIds: new Set<number>(), selectionMode: false },
            undefined,
            'library/batchRemoveClear'
          );
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
type LibraryFilterState = Pick<
  LibraryState,
  'entries' | 'activeFilter' | 'searchQuery' | 'sortBy' | 'sortOrder'
>;

export const getFilteredEntries = createFilteredListSelector<AnimeEntry, LibraryFilterState>({
  selectItems: state => state.entries,
  matchesFilter: ({ activeFilter }) =>
    activeFilter === 'all' ? null : e => e.status === activeFilter,
  matchesSearch: ({ searchQuery }) => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return e =>
      e.title.toLowerCase().includes(query) ||
      (e.titleRomaji?.toLowerCase().includes(query) ?? false) ||
      (e.titleNative?.toLowerCase().includes(query) ?? false);
  },
  comparator:
    ({ sortBy, sortOrder }) =>
    (a, b) => {
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
    },
});
