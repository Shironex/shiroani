import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Rss, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FeedItem, type FeedSource } from '@shiroani/shared';
import { ProgressBar } from '@/components/shared/ProgressBar';

interface FeedSidebarProps {
  sources: FeedSource[];
  items: FeedItem[];
  sourceFilter: number | null;
  onSetSourceFilter: (id: number | null) => void;
  totalCount: number;
  /** When true, non-source cards dim because bookmarks view doesn't compose with filters. */
  isBookmarksView: boolean;
}

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
export const FeedSidebar = memo(function FeedSidebar({
  sources,
  items,
  sourceFilter,
  onSetSourceFilter,
  totalCount,
  isBookmarksView,
}: FeedSidebarProps) {
  const { t } = useTranslation('feed');
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

  // Trending — use source frequency in loaded items as a proxy for "hot".
  const trending = useMemo(() => {
    return visibleSources
      .map(s => ({
        source: s,
        count: perSourceCount.get(s.id) ?? 0,
      }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [visibleSources, perSourceCount]);

  const maxTrending = trending[0]?.count ?? 1;

  return (
    <aside className="flex flex-col gap-2.5 min-w-0">
      {/* Sources card */}
      <div
        className={cn(
          'rounded-[10px] border border-white/[0.07] bg-white/[0.025] p-2.5 px-3 transition-opacity duration-150',
          isBookmarksView && 'opacity-50 pointer-events-none'
        )}
        aria-hidden={isBookmarksView}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-[5px] grid place-items-center bg-primary/15 text-primary">
            <Rss className="w-3 h-3" />
          </span>
          <h4 className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground font-semibold">
            {t('sidebar.mySources')}
          </h4>
          <span className="ml-auto font-mono text-[9.5px] text-muted-foreground/60">
            {visibleSources.length}
          </span>
        </div>

        <ul className="flex flex-col">
          {/* "All" row */}
          <li>
            <button
              type="button"
              onClick={() => onSetSourceFilter(null)}
              aria-pressed={sourceFilter === null}
              className={cn(
                'group w-full flex items-center gap-2.5 py-1.5 text-[11.5px]',
                'border-b border-white/[0.04] last:border-b-0',
                'transition-colors duration-150 cursor-pointer',
                sourceFilter === null
                  ? 'text-foreground'
                  : 'text-muted-foreground/90 hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'w-[18px] h-[18px] rounded-[4px] grid place-items-center text-[10px] font-semibold shrink-0',
                  sourceFilter === null
                    ? 'bg-primary/20 text-primary'
                    : 'bg-foreground/10 text-muted-foreground'
                )}
              >
                ∀
              </span>
              <span className="flex-1 text-left truncate">{t('sidebar.allSources')}</span>
              <span
                className={cn(
                  'font-mono text-[9.5px]',
                  sourceFilter === null ? 'text-primary font-bold' : 'text-muted-foreground/60'
                )}
              >
                {totalCount}
              </span>
            </button>
          </li>

          {visibleSources.slice(0, 8).map(source => {
            const isActive = sourceFilter === source.id;
            const count = perSourceCount.get(source.id) ?? 0;
            const isLive = count > 0;
            const initial = source.name.charAt(0).toUpperCase();
            return (
              <li key={source.id}>
                <button
                  type="button"
                  onClick={() => onSetSourceFilter(isActive ? null : source.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'group w-full flex items-center gap-2.5 py-1.5 text-[11.5px]',
                    'border-b border-white/[0.04] last:border-b-0',
                    'transition-colors duration-150 cursor-pointer',
                    isActive ? 'text-foreground' : 'text-muted-foreground/90 hover:text-foreground'
                  )}
                >
                  <span
                    className="w-[18px] h-[18px] rounded-[4px] grid place-items-center text-white font-serif font-bold text-[10px] shrink-0"
                    style={{ backgroundColor: source.color }}
                  >
                    {initial}
                  </span>
                  <span className="flex-1 text-left truncate">
                    {source.name}
                    {source.language === 'pl' && <span className="ml-1 opacity-80">🇵🇱</span>}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[9.5px]',
                      isLive ? 'text-primary font-bold' : 'text-muted-foreground/50'
                    )}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Trending card */}
      {trending.length > 0 && (
        <div
          className={cn(
            'rounded-[10px] border border-white/[0.07] bg-white/[0.025] p-2.5 px-3 transition-opacity duration-150',
            isBookmarksView && 'opacity-50 pointer-events-none'
          )}
          aria-hidden={isBookmarksView}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-[5px] grid place-items-center bg-primary/15 text-primary">
              <Flame className="w-3 h-3" />
            </span>
            <h4 className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground font-semibold">
              {t('sidebar.trending')}
            </h4>
            <span className="ml-auto font-mono text-[9.5px] text-muted-foreground/60">
              {t('sidebar.trendingPeriod')}
            </span>
          </div>

          <ol className="flex flex-col">
            {trending.map((trend, idx) => (
              <li
                key={trend.source.id}
                className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-b-0"
              >
                <span className="w-5 font-serif font-extrabold text-[15px] text-primary leading-none shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-medium truncate text-foreground/90 leading-tight">
                    {trend.source.name}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground/60 mt-0.5">
                    {t('sidebar.entries', { count: trend.count })}
                  </div>
                </div>
                <div className="w-10 shrink-0">
                  <ProgressBar
                    value={(trend.count / maxTrending) * 100}
                    thickness={3}
                    aria-label={t('sidebar.activityAria', { name: trend.source.name })}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
});
