import type { FeedItem, FeedSource } from '@shiroani/shared';

export interface IFeedSidebarProps {
  sources: FeedSource[];
  items: FeedItem[];
  sourceFilter: number | null;
  onSetSourceFilter: (id: number | null) => void;
  totalCount: number;
  /** When true, non-source cards dim because bookmarks view doesn't compose with filters. */
  isBookmarksView: boolean;
}

/** A source row in the "My sources" card with its live item count. */
export interface IFeedSidebarSourceRow {
  readonly source: FeedSource;
  readonly count: number;
  readonly isLive: boolean;
  readonly initial: string;
}

/** A trending entry with its activity bar percentage (0–100). */
export interface IFeedSidebarTrend {
  readonly source: FeedSource;
  readonly count: number;
  readonly percent: number;
}

export interface IFeedSidebarView {
  readonly visibleSourcesCount: number;
  readonly sourceRows: IFeedSidebarSourceRow[];
  readonly trending: IFeedSidebarTrend[];
}
