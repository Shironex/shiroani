import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tDynamic } from '@/lib/i18n';
import { useDiaryStore, getFilteredDiaryEntries } from '@/stores/useDiaryStore';
import type { DiaryEntry } from '@shiroani/shared';
import type { DiarySortBy } from '@/stores/useDiaryStore';
import type { IDiaryViewView } from './DiaryView.types';

const DIARY_FILTER_OPTIONS = [
  { value: 'all' as const, labelKey: 'filter.all' },
  { value: 'pinned' as const, labelKey: 'filter.pinned' },
  { value: 'with_anime' as const, labelKey: 'filter.withAnime' },
];

const DIARY_SORT_OPTIONS = [
  { value: 'createdAt', labelKey: 'sort.createdAt' },
  { value: 'updatedAt', labelKey: 'sort.updatedAt' },
  { value: 'title', labelKey: 'sort.title' },
] as const;

// Stable action references — never change for the life of the store.
const {
  setFilter,
  setSearchQuery,
  setViewMode,
  setSort,
  openEditor,
  closeEditor,
  createEntry,
  updateEntry,
  removeEntry,
} = useDiaryStore.getState();

export function useDiaryView(): IDiaryViewView {
  const { t, i18n } = useTranslation(['diary', 'common']);
  const entries = useDiaryStore(s => s.entries);
  const activeFilter = useDiaryStore(s => s.activeFilter);
  const searchQuery = useDiaryStore(s => s.searchQuery);
  const viewMode = useDiaryStore(s => s.viewMode);
  const sortBy = useDiaryStore(s => s.sortBy);
  const sortOrder = useDiaryStore(s => s.sortOrder);
  const isEditorOpen = useDiaryStore(s => s.isEditorOpen);
  const selectedEntry = useDiaryStore(s => s.selectedEntry);
  const isLoading = useDiaryStore(s => s.isLoading);
  const error = useDiaryStore(s => s.error);

  // Read the socket-lifecycle actions from the store so they can be stubbed in
  // tests via `setState` — they touch the socket on mount and would otherwise
  // throw without a connection.
  const initListeners = useDiaryStore(s => s.initListeners);
  const fetchEntries = useDiaryStore(s => s.fetchEntries);
  const cleanupListeners = useDiaryStore(s => s.cleanupListeners);

  const [entryToRemove, setEntryToRemove] = useState<DiaryEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleSortChange = useCallback(
    (value: string) => {
      setSort(value as DiarySortBy, sortOrder);
    },
    [sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortBy, sortOrder]);

  const handleTogglePin = useCallback(
    (e: DiaryEntry) => updateEntry({ id: e.id, isPinned: !e.isPinned }),
    []
  );

  useEffect(() => {
    initListeners();
    fetchEntries();
    return () => cleanupListeners();
  }, [initListeners, fetchEntries, cleanupListeners]);

  const filteredEntries = useMemo(
    () => getFilteredDiaryEntries({ entries, activeFilter, searchQuery, sortBy, sortOrder }),
    [entries, activeFilter, searchQuery, sortBy, sortOrder]
  );

  const subtitle = entries.length > 0 ? t('subtitle', { count: entries.length }) : undefined;

  const localizedFilterOptions = useMemo(
    () =>
      DIARY_FILTER_OPTIONS.map(opt => ({
        value: opt.value,
        label: tDynamic(i18n, `diary:${opt.labelKey}`),
      })),
    [i18n, i18n.language]
  );

  const resolveSortLabel = useCallback(
    (labelKey: string) => tDynamic(i18n, `diary:${labelKey}`),
    [i18n, i18n.language]
  );

  const isEmpty = filteredEntries.length === 0;

  return {
    t,
    entries,
    activeFilter,
    searchQuery,
    viewMode,
    sortBy,
    sortOrder,
    isEditorOpen,
    selectedEntry,
    isLoading,
    error,
    entryToRemove,
    setEntryToRemove,
    isExportOpen,
    setIsExportOpen,
    isImportOpen,
    setIsImportOpen,
    filteredEntries,
    subtitle,
    localizedFilterOptions,
    isEmpty,
    sortOptions: DIARY_SORT_OPTIONS,
    resolveSortLabel,
    handleSortChange,
    toggleSortOrder,
    handleTogglePin,
    setFilter,
    setSearchQuery,
    setViewMode,
    openEditor,
    closeEditor,
    createEntry,
    updateEntry,
    removeEntry,
    fetchEntries,
  };
}
