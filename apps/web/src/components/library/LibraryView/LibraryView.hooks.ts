import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLibraryStore, getFilteredEntries } from '@/stores/useLibraryStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { getStatusFilterOptions } from '@/lib/constants';
import { useNextAiringMap } from '@/hooks/useNextAiringMap';
import type { AnimeEntry } from '@shiroani/shared';
import type {
  ILibraryViewView,
  LibraryFilter,
  LibrarySortBy,
  LibrarySortOrder,
} from './LibraryView.types';

const {
  setFilter,
  setSearchQuery,
  setViewMode,
  setSort,
  openDetail,
  closeDetail,
  removeFromLibrary,
  setSelectionMode,
  setSelected,
} = useLibraryStore.getState();

export function useLibraryView(): ILibraryViewView {
  const { i18n } = useTranslation(['library', 'common']);
  const entries = useLibraryStore(s => s.entries);
  const activeFilter = useLibraryStore(s => s.activeFilter);
  const searchQuery = useLibraryStore(s => s.searchQuery);
  const sortBy = useLibraryStore(s => s.sortBy);
  const sortOrder = useLibraryStore(s => s.sortOrder);
  const viewMode = useLibraryStore(s => s.viewMode);
  const isLoading = useLibraryStore(s => s.isLoading);
  const error = useLibraryStore(s => s.error);
  const isDetailOpen = useLibraryStore(s => s.isDetailOpen);
  const selectedEntry = useLibraryStore(s => s.selectedEntry);
  const selectionMode = useLibraryStore(s => s.selectionMode);

  const [showStats, setShowStats] = useState(false);
  const [entryToRemove, setEntryToRemove] = useState<AnimeEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const openTab = useBrowserStore(s => s.openTab);
  const navigateTo = useAppStore(s => s.navigateTo);

  const nextAiringMap = useNextAiringMap();

  const handleSortChange = useCallback(
    (value: string) => {
      setSort(value as LibrarySortBy, sortOrder);
    },
    [sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortBy, sortOrder]);

  const handleRandomPick = useCallback(() => {
    const planToWatch = entries.filter(e => e.status === 'plan_to_watch');
    if (planToWatch.length === 0) return;
    const randomEntry = planToWatch[Math.floor(Math.random() * planToWatch.length)];
    openDetail(randomEntry);
  }, [entries]);

  // Navigate to the browser view and open the resume URL
  const handleContinue = useCallback(
    (entry: AnimeEntry) => {
      if (!entry.resumeUrl) return;
      openTab(entry.resumeUrl);
      navigateTo('browser');
    },
    [openTab, navigateTo]
  );

  const filteredEntries = useMemo(
    () => getFilteredEntries({ entries, activeFilter, searchQuery, sortBy, sortOrder }),
    [entries, activeFilter, searchQuery, sortBy, sortOrder]
  );

  // Select every currently-visible (filtered) entry for a batch operation.
  const handleSelectAllVisible = useCallback(() => {
    setSelected(filteredEntries.map(e => e.id));
  }, [filteredEntries]);

  // Per-status counts for the filter chips, matching mock "Wszystko · 184".
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    for (const e of entries) {
      counts[e.status] = (counts[e.status] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const filtersWithCounts = useMemo(
    () =>
      getStatusFilterOptions().map(opt => {
        const count = statusCounts[opt.value] ?? 0;
        return {
          value: opt.value as LibraryFilter,
          label: count > 0 ? `${opt.label} · ${count}` : opt.label,
        };
      }),
    [statusCounts, i18n.language]
  );

  const subtitle =
    entries.length > 0 ? i18n.t('subtitle', { ns: 'library', count: entries.length }) : undefined;

  const handleRetry = useCallback(() => {
    useLibraryStore.getState().fetchLibrary();
  }, []);

  const handleNavigateToBrowser = useCallback(() => {
    navigateTo('browser');
  }, [navigateTo]);

  return {
    entries,
    activeFilter,
    searchQuery,
    sortBy,
    sortOrder,
    viewMode,
    isLoading,
    error,
    isDetailOpen,
    selectedEntry,
    selectionMode,
    showStats,
    setShowStats,
    entryToRemove,
    setEntryToRemove,
    isExportOpen,
    setIsExportOpen,
    isImportOpen,
    setIsImportOpen,
    nextAiringMap,
    filteredEntries,
    filtersWithCounts,
    subtitle,
    handleSortChange,
    toggleSortOrder,
    handleRandomPick,
    handleContinue,
    handleSelectAllVisible,
    handleRetry,
    handleNavigateToBrowser,
    setFilter: setFilter as (filter: LibraryFilter) => void,
    setSearchQuery,
    setViewMode: setViewMode as (mode: ILibraryViewView['viewMode']) => void,
    openDetail,
    closeDetail,
    removeFromLibrary,
    setSelectionMode,
  };
}

// Re-exported so the union types stay close to the hook that produces them.
export type { LibrarySortBy, LibrarySortOrder };
