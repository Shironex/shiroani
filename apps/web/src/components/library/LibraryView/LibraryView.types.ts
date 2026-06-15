import type { Dispatch, SetStateAction } from 'react';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';

export type ILibraryViewProps = Record<string, never>;

export type LibrarySortBy = 'title' | 'score' | 'progress' | 'updatedAt';
export type LibrarySortOrder = 'asc' | 'desc';
export type LibraryFilter = 'all' | AnimeStatus;
export type LibraryViewMode = 'grid' | 'list';

export interface ILibraryFilterChip {
  value: LibraryFilter;
  label: string;
}

export interface ILibraryViewView {
  // Store state
  readonly entries: AnimeEntry[];
  readonly activeFilter: LibraryFilter;
  readonly searchQuery: string;
  readonly sortBy: LibrarySortBy;
  readonly sortOrder: LibrarySortOrder;
  readonly viewMode: LibraryViewMode;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isDetailOpen: boolean;
  readonly selectedEntry: AnimeEntry | null;
  readonly selectionMode: boolean;

  // Local state
  readonly showStats: boolean;
  readonly setShowStats: Dispatch<SetStateAction<boolean>>;
  readonly entryToRemove: AnimeEntry | null;
  readonly setEntryToRemove: Dispatch<SetStateAction<AnimeEntry | null>>;
  readonly isExportOpen: boolean;
  readonly setIsExportOpen: Dispatch<SetStateAction<boolean>>;
  readonly isImportOpen: boolean;
  readonly setIsImportOpen: Dispatch<SetStateAction<boolean>>;

  // Derived data
  readonly nextAiringMap: Map<number, { episode: number; airingAt: number }>;
  readonly filteredEntries: AnimeEntry[];
  readonly filtersWithCounts: ILibraryFilterChip[];
  readonly subtitle: string | undefined;

  // Handlers
  readonly handleSortChange: (value: string) => void;
  readonly toggleSortOrder: () => void;
  readonly handleRandomPick: () => void;
  readonly handleContinue: (entry: AnimeEntry) => void;
  readonly handleSelectAllVisible: () => void;
  readonly handleRetry: () => void;
  readonly handleNavigateToBrowser: () => void;

  // Store action refs (called directly from JSX)
  readonly setFilter: (filter: LibraryFilter) => void;
  readonly setSearchQuery: (query: string) => void;
  readonly setViewMode: (mode: LibraryViewMode) => void;
  readonly openDetail: (entry: AnimeEntry) => void;
  readonly closeDetail: () => void;
  readonly removeFromLibrary: (id: number) => void;
  readonly setSelectionMode: (on: boolean) => void;
}
