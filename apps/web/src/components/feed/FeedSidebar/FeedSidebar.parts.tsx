import { useTranslation } from 'react-i18next';
import { Rss, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readableTextColor } from '@/lib/color-utils';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { IFeedSidebarSourceRow, IFeedSidebarTrend } from './FeedSidebar.types';

interface ISourcesCardProps {
  rows: IFeedSidebarSourceRow[];
  visibleSourcesCount: number;
  sourceFilter: number | null;
  onSetSourceFilter: (id: number | null) => void;
  totalCount: number;
  isBookmarksView: boolean;
}

/** "My sources" card — the "All" row plus a row per enabled source. */
export function SourcesCard({
  rows,
  visibleSourcesCount,
  sourceFilter,
  onSetSourceFilter,
  totalCount,
  isBookmarksView,
}: ISourcesCardProps) {
  const { t } = useTranslation('feed');

  return (
    <div
      className={cn(
        'rounded-lg border border-border-glass bg-foreground/[0.03] p-2.5 px-3 transition-opacity duration-150',
        isBookmarksView && 'opacity-50'
      )}
      // `inert` removes the card's buttons from both the tab order and the
      // accessibility tree while bookmarks view is active, so they aren't
      // reachable behind the dimmed overlay.
      inert={isBookmarksView}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-sm grid place-items-center bg-primary/15 text-primary">
          <Rss className="w-3 h-3" />
        </span>
        <h4 className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground font-semibold">
          {t('sidebar.mySources')}
        </h4>
        <span className="ml-auto font-mono text-[9.5px] text-muted-foreground/60">
          {visibleSourcesCount}
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
              'border-b border-border-glass last:border-b-0',
              'transition-colors duration-150 cursor-pointer rounded-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
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

        {rows.map(({ source, count, isLive, initial }) => {
          const isActive = sourceFilter === source.id;
          return (
            <li key={source.id}>
              <button
                type="button"
                onClick={() => onSetSourceFilter(isActive ? null : source.id)}
                aria-pressed={isActive}
                className={cn(
                  'group w-full flex items-center gap-2.5 py-1.5 text-[11.5px]',
                  'border-b border-border-glass last:border-b-0',
                  'transition-colors duration-150 cursor-pointer rounded-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isActive ? 'text-foreground' : 'text-muted-foreground/90 hover:text-foreground'
                )}
              >
                <span
                  className="w-[18px] h-[18px] rounded-[4px] grid place-items-center font-serif font-bold text-[10px] shrink-0"
                  style={{ backgroundColor: source.color, color: readableTextColor(source.color) }}
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
  );
}

interface ITrendingCardProps {
  trending: IFeedSidebarTrend[];
  isBookmarksView: boolean;
}

/** "Most active" card — top sources by frequency in loaded items. */
export function TrendingCard({ trending, isBookmarksView }: ITrendingCardProps) {
  const { t } = useTranslation('feed');

  return (
    <div
      className={cn(
        'rounded-lg border border-border-glass bg-foreground/[0.03] p-2.5 px-3 transition-opacity duration-150',
        isBookmarksView && 'opacity-50'
      )}
      // `inert` hides the trending card from the tab order and AT while the
      // bookmarks view dims it (the trending proxy doesn't compose with filters).
      inert={isBookmarksView}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-sm grid place-items-center bg-primary/15 text-primary">
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
            className="flex items-center gap-2 py-1 border-b border-border-glass last:border-b-0"
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
                value={trend.percent}
                thickness={3}
                aria-label={t('sidebar.activityAria', { name: trend.source.name })}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
