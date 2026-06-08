import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, SearchX, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { FilterTabBar, type FilterTab } from '@/components/shared/FilterTabBar';

interface ViewHeaderProps<T extends string = string> {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Search handlers — when omitted, the search input is not rendered. */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  /** Filter tabs — when omitted, the tab row is not rendered. */
  filters?: FilterTab<T>[];
  activeFilter?: T;
  onFilterChange?: (filter: T) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

/**
 * ViewHeader — shell-aligned header used at the top of every main view.
 *
 * Mirrors the `.vh` pattern from the redesign mocks:
 *   - 36×36 icon tile in primary/15 with a primary/30 border
 *   - 20px DM Sans 800 title, -0.02em tracking, paired with a 10px
 *     JetBrains Mono uppercase subtitle (tracking 0.15em, muted-foreground)
 *   - Right-side action cluster (e.g. sort, import/export, view-mode toggles)
 *   - Optional search + filter tabs underneath for the views that need them
 *
 * Search input, filter tabs and view-mode toggles are all optional. If neither
 * search nor filters are provided, the second row is skipped entirely so views
 * that only want the title bar (Settings, Profile, Schedule) stay visually
 * consistent with the editorial mock.
 */
export function ViewHeader<T extends string = string>({
  icon: Icon,
  title,
  subtitle,
  actions,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  filters,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: ViewHeaderProps<T>) {
  const { t } = useTranslation('nav');
  const finalSearchPlaceholder = searchPlaceholder ?? t('header.searchPlaceholder');
  const showSearch = onSearchChange !== undefined;
  const showFilters = filters !== undefined && filters.length > 0;
  const showSecondRow = showSearch || showFilters;

  return (
    <div className="shrink-0 relative">
      {/* Title row — matches .vh */}
      <div className="relative flex items-center justify-between border-b border-border-glass px-7 pt-[18px] pb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={cn(
              'size-9 rounded-[10px] grid place-items-center flex-shrink-0',
              'bg-primary/15 border border-primary/30 text-primary'
            )}
          >
            <Icon className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em] leading-none text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <span className="block mt-[3px] font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
          {onViewModeChange && (
            <>
              <div className="w-px h-4 bg-border-glass mx-1 shrink-0" />
              <TooltipButton
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'size-8 shrink-0',
                  viewMode === 'grid' && 'bg-primary/15 text-primary hover:bg-primary/15'
                )}
                onClick={() => onViewModeChange('grid')}
                tooltip={t('header.viewModeGrid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </TooltipButton>
              <TooltipButton
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'size-8 shrink-0',
                  viewMode === 'list' && 'bg-primary/15 text-primary hover:bg-primary/15'
                )}
                onClick={() => onViewModeChange('list')}
                tooltip={t('header.viewModeList')}
              >
                <List className="w-4 h-4" />
              </TooltipButton>
            </>
          )}
        </div>
      </div>

      {/* Search + filter row — only rendered when at least one is enabled */}
      {showSecondRow && (
        <div className="px-7 pt-3 pb-3 space-y-3 border-b border-border-glass">
          {showSearch && (
            <div className="relative group/search">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within/search:text-primary/70" />
              <Input
                value={searchQuery ?? ''}
                onChange={e => onSearchChange?.(e.target.value)}
                placeholder={finalSearchPlaceholder}
                aria-label={finalSearchPlaceholder}
                className="pl-8 h-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange?.('')}
                  aria-label={t('header.clearSearch')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                >
                  <SearchX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {showFilters && activeFilter !== undefined && onFilterChange && (
            <FilterTabBar<T> tabs={filters} active={activeFilter} onChange={onFilterChange} />
          )}
        </div>
      )}
    </div>
  );
}
