import type { TFunction } from 'i18next';
import type { FeedCategory, FeedItem, FeedLanguage, FeedSource } from '@shiroani/shared';
import type { FeedViewState } from '../feed-view-state';

export interface IFeedFilterOption<TValue> {
  readonly value: TValue;
  readonly label: string;
}

export interface IFeedViewView {
  readonly t: TFunction<'feed'>;
  readonly categoryFilterOptions: IFeedFilterOption<FeedCategory | 'all'>[];
  readonly languageFilterOptions: IFeedFilterOption<FeedLanguage | 'all'>[];
  readonly items: FeedItem[];
  readonly sources: FeedSource[];
  readonly total: number;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly hasMore: boolean;
  readonly categoryFilter: FeedCategory | 'all';
  readonly languageFilter: FeedLanguage | 'all';
  readonly sourceFilter: number | null;
  readonly isRefreshing: boolean;
  readonly lastRefreshNewCount: number | null;
  readonly readIds: Set<number>;
  readonly bookmarks: ReadonlyMap<number, unknown>;
  readonly searchQuery: string;
  readonly feedView: 'all' | 'bookmarks';
  readonly setFeedView: (view: 'all' | 'bookmarks') => void;
  readonly readerItem: FeedItem | null;
  readonly isReaderOpen: boolean;
  readonly setIsReaderOpen: (open: boolean) => void;
  readonly setReaderItem: (item: FeedItem | null) => void;
  readonly searchedItems: FeedItem[];
  readonly visibleItems: FeedItem[];
  readonly heroItem: FeedItem | null;
  readonly listItems: FeedItem[];
  readonly subtitle: string;
  readonly viewState: FeedViewState;
  /** `lastRefreshNewCount` is set and positive — show the +N refresh badge. */
  readonly hasNewCount: boolean;
  /** Search returned nothing in the "all" view — show the no-results state. */
  readonly showNoResults: boolean;
  /** "all" view has more pages and search isn't active — show the load-more CTA. */
  readonly canLoadMore: boolean;
  readonly handleOpenInReader: (item: FeedItem) => void;
  readonly handleOpenExternal: (item: FeedItem) => void;
  readonly handleLoadMore: () => void;
  readonly handleSearchChange: (q: string) => void;
  readonly handleCategoryFilterChange: (category: FeedCategory | 'all') => void;
  readonly fetchItems: (loadMore?: boolean, options?: { bootstrapIfEmpty?: boolean }) => void;
  readonly refreshFeeds: (options?: { isBootstrap?: boolean }) => void;
  readonly setLanguageFilter: (lang: FeedLanguage | 'all') => void;
  readonly setSourceFilter: (id: number | null) => void;
  readonly markAllRead: () => void;
}
