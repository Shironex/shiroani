import type { Dispatch, SetStateAction } from 'react';
import type { AiringAnime, DiscoverSort, DiscoverFilters } from '@shiroani/shared';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

export type DiscoverTab = 'trending' | 'popular' | 'seasonal' | 'random' | 'recommendations';

export interface IDiscoverTabOption {
  value: DiscoverTab;
  label: string;
}

export interface IDiscoverViewView {
  readonly tabs: IDiscoverTabOption[];
  readonly activeTab: DiscoverTab;
  readonly searchQuery: string;
  readonly sort: DiscoverSort;
  readonly filters: DiscoverFilters;
  readonly excludeLibrary: boolean;
  readonly connected: boolean;
  readonly libraryIds: Set<number>;
  readonly excludedIds: Set<number>;
  readonly items: DiscoverMedia[];
  readonly page: { current: number; hasNext: boolean };
  readonly error: string | null;
  readonly gridKey: string;
  readonly isSearchMode: boolean;
  readonly isRandomMode: boolean;
  readonly isRecommendationsMode: boolean;
  readonly isSpecialMode: boolean;
  readonly isLoading: boolean;
  readonly showLoading: boolean;
  readonly showEmpty: boolean;
  readonly showGrid: boolean;
  readonly showControls: boolean;
  readonly showSortSelect: boolean;
  readonly showFiltersPanel: boolean;
  readonly showError: boolean;
  readonly showSkeleton: boolean;
  readonly selectedAnime: AiringAnime | null;
  readonly dialogOpen: boolean;
  readonly setDialogOpen: Dispatch<SetStateAction<boolean>>;
  readonly handleCardClick: (media: DiscoverMedia) => void;
  readonly handleAddToLibrary: (media: DiscoverMedia) => Promise<void>;
  readonly handleTabChange: (tab: DiscoverTab) => void;
  readonly handleSearchChange: (value: string) => void;
  readonly handleClearSearch: () => void;
  readonly handleSortChange: (next: DiscoverSort) => void;
  readonly handleFiltersChange: (next: DiscoverFilters) => void;
  readonly handleExcludeToggle: (next: boolean) => void;
  readonly handleRetry: () => void;
  readonly handleLoadMore: () => void;
}
