import { memo } from 'react';
import { useFeedSidebar } from './FeedSidebar.hooks';
import { SourcesCard, TrendingCard } from './FeedSidebar.parts';
import type { IFeedSidebarProps } from './FeedSidebar.types';

/**
 * Right-hand rail for the news feed.
 *   - "Moje źródła" card lists enabled sources, each with live item count.
 *     Clicking a source row toggles it as the active source filter.
 *   - "Najczęściej wspominane" card surfaces the most frequent source names
 *     across currently loaded items as a cheap trending proxy — the store
 *     doesn't expose per-title mention counts, so we fall back to sources.
 *
 * The primary Wszystkie/Zakładki view toggle lives in the parent's ViewHeader
 * so it's discoverable regardless of viewport (this sidebar only renders at
 * xl breakpoints). This component just dims its cards when the parent is in
 * bookmarks mode.
 */
function FeedSidebar({
  sources,
  items,
  sourceFilter,
  onSetSourceFilter,
  totalCount,
  isBookmarksView,
}: IFeedSidebarProps) {
  const { visibleSourcesCount, sourceRows, trending } = useFeedSidebar(items, sources);

  return (
    <aside className="flex flex-col gap-2.5 min-w-0">
      <SourcesCard
        rows={sourceRows}
        visibleSourcesCount={visibleSourcesCount}
        sourceFilter={sourceFilter}
        onSetSourceFilter={onSetSourceFilter}
        totalCount={totalCount}
        isBookmarksView={isBookmarksView}
      />

      {trending.length > 0 && (
        <TrendingCard trending={trending} isBookmarksView={isBookmarksView} />
      )}
    </aside>
  );
}

export default memo(FeedSidebar);
