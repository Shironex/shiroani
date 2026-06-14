import type { TFunction } from 'i18next';
import type { DiaryCreatePayload, DiaryEntry, DiaryUpdatePayload } from '@shiroani/shared';
import type { DiaryFilter, DiarySortBy } from '@/stores/useDiaryStore';

export interface IDiaryFilterOption {
  readonly value: DiaryFilter;
  readonly label: string;
}

export interface IDiarySortOption {
  readonly value: DiarySortBy;
  readonly labelKey: string;
}

export interface IDiaryViewView {
  readonly t: TFunction<['diary', 'common']>;
  readonly entries: DiaryEntry[];
  readonly activeFilter: DiaryFilter;
  readonly searchQuery: string;
  readonly viewMode: 'grid' | 'list';
  readonly sortBy: DiarySortBy;
  readonly sortOrder: 'asc' | 'desc';
  readonly isEditorOpen: boolean;
  readonly selectedEntry: DiaryEntry | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly entryToRemove: DiaryEntry | null;
  readonly setEntryToRemove: (entry: DiaryEntry | null) => void;
  readonly isExportOpen: boolean;
  readonly setIsExportOpen: (open: boolean) => void;
  readonly isImportOpen: boolean;
  readonly setIsImportOpen: (open: boolean) => void;
  readonly filteredEntries: DiaryEntry[];
  readonly subtitle: string | undefined;
  readonly localizedFilterOptions: IDiaryFilterOption[];
  readonly isEmpty: boolean;
  readonly sortOptions: readonly IDiarySortOption[];
  readonly resolveSortLabel: (labelKey: string) => string;
  readonly handleSortChange: (value: string) => void;
  readonly toggleSortOrder: () => void;
  readonly handleTogglePin: (entry: DiaryEntry) => void;
  readonly setFilter: (filter: DiaryFilter) => void;
  readonly setSearchQuery: (query: string) => void;
  readonly setViewMode: (mode: 'grid' | 'list') => void;
  readonly openEditor: (entry?: DiaryEntry) => void;
  readonly closeEditor: () => void;
  readonly createEntry: (payload: DiaryCreatePayload) => Promise<boolean>;
  readonly updateEntry: (payload: DiaryUpdatePayload) => Promise<boolean>;
  readonly removeEntry: (id: number) => Promise<boolean>;
  readonly fetchEntries: () => void;
}
