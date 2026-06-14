import { useMemo } from 'react';
import type { FeedItem, FeedSource } from '@shiroani/shared';
import type {
  IFeedSidebarSourceRow,
  IFeedSidebarTrend,
  IFeedSidebarView,
} from './FeedSidebar.types';

export function useFeedSidebar(items: FeedItem[], sources: FeedSource[]): IFeedSidebarView {
  // Count items per source from the currently-loaded set for "live" counters
  const perSourceCount = useMemo(() => {
    const map = new Map<number, number>();
    for (const it of items) {
      map.set(it.feedSourceId, (map.get(it.feedSourceId) ?? 0) + 1);
    }
    return map;
  }, [items]);

  // Only enabled sources, sorted by current count desc so "live" ones float up
  const visibleSources = useMemo(() => {
    const enabled = sources.filter(s => s.enabled);
    return enabled
      .slice()
      .sort((a, b) => (perSourceCount.get(b.id) ?? 0) - (perSourceCount.get(a.id) ?? 0));
  }, [sources, perSourceCount]);

  const sourceRows = useMemo<IFeedSidebarSourceRow[]>(
    () =>
      visibleSources.slice(0, 8).map(source => {
        const count = perSourceCount.get(source.id) ?? 0;
        return {
          source,
          count,
          isLive: count > 0,
          initial: source.name.charAt(0).toUpperCase(),
        };
      }),
    [visibleSources, perSourceCount]
  );

  // Trending — use source frequency in loaded items as a proxy for "hot".
  const trending = useMemo<IFeedSidebarTrend[]>(() => {
    const top = visibleSources
      .map(s => ({
        source: s,
        count: perSourceCount.get(s.id) ?? 0,
      }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const maxTrending = top[0]?.count ?? 1;
    return top.map(t => ({ ...t, percent: (t.count / maxTrending) * 100 }));
  }, [visibleSources, perSourceCount]);

  return { visibleSourcesCount: visibleSources.length, sourceRows, trending };
}
