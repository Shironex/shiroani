import { useCallback, useMemo, useState } from 'react';
import {
  Library as LibraryIcon,
  BookOpen,
  Globe,
  SearchX,
  BarChart3,
  Download,
  Upload,
  ArrowUpDown,
  Dices,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { useLibraryStore, getFilteredEntries } from '@/stores/useLibraryStore';
import { AnimeCard } from '@/components/library/AnimeCard';
import { AnimeDetailModal } from '@/components/library/AnimeDetailModal';
import { LibraryListItem } from '@/components/library/LibraryListItem';
import { LibrarySkeleton } from '@/components/library/LibrarySkeleton';
import { LibraryStats } from '@/components/library/LibraryStats';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from 'react-i18next';
import { getStatusFilterOptions } from '@/lib/constants';
import { tDynamic } from '@/lib/i18n';
import { useNextAiringMap } from '@/hooks/useNextAiringMap';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';

const SORT_OPTIONS = [
  { value: 'title', labelKey: 'library:sort.title' },
  { value: 'score', labelKey: 'library:sort.score' },
  { value: 'progress', labelKey: 'library:sort.progress' },
  { value: 'updatedAt', labelKey: 'library:sort.updatedAt' },
] as const;

const {
  setFilter,
  setSearchQuery,
  setViewMode,
  setSort,
  openDetail,
  closeDetail,
  removeFromLibrary,
} = useLibraryStore.getState();

export function LibraryView() {
  const { t, i18n } = useTranslation('library');
  const entries = useLibraryStore(s => s.entries);
  const activeFilter = useLibraryStore(s => s.activeFilter);
  const searchQuery = useLibraryStore(s => s.searchQuery);
  const sortBy = useLibraryStore(s => s.sortBy);
  const sortOrder = useLibraryStore(s => s.sortOrder);
  const viewMode = useLibraryStore(s => s.viewMode);
  const isLoading = useLibraryStore(s => s.isLoading);
  const isDetailOpen = useLibraryStore(s => s.isDetailOpen);
  const selectedEntry = useLibraryStore(s => s.selectedEntry);

  const [showStats, setShowStats] = useState(false);
  const [entryToRemove, setEntryToRemove] = useState<AnimeEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const openTab = useBrowserStore(s => s.openTab);
  const navigateTo = useAppStore(s => s.navigateTo);

  const nextAiringMap = useNextAiringMap();

  const handleSortChange = useCallback(
    (value: string) => {
      setSort(value as 'title' | 'score' | 'progress' | 'updatedAt', sortOrder);
    },
    [sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortBy, sortOrder]);

  const handleRandomPick = useCallback(() => {
    const planToWatch = entries.filter(e => e.status === 'plan_to_watch');
    if (planToWatch.length === 0) return;
    const randomEntry = planToWatch[Math.floor(Math.random() * planToWatch.length)];
    openDetail(randomEntry);
  }, [entries]);

  // Navigate to the browser view and open the resume URL
  const handleContinue = useCallback(
    (entry: AnimeEntry) => {
      if (!entry.resumeUrl) return;
      openTab(entry.resumeUrl);
      navigateTo('browser');
    },
    [openTab, navigateTo]
  );

  const filteredEntries = useMemo(
    () => getFilteredEntries({ entries, activeFilter, searchQuery, sortBy, sortOrder }),
    [entries, activeFilter, searchQuery, sortBy, sortOrder]
  );

  // Per-status counts for the filter chips, matching mock "Wszystko · 184".
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    for (const e of entries) {
      counts[e.status] = (counts[e.status] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const filtersWithCounts = useMemo(
    () =>
      getStatusFilterOptions().map(opt => {
        const count = statusCounts[opt.value] ?? 0;
        return {
          value: opt.value as 'all' | AnimeStatus,
          label: count > 0 ? `${opt.label} · ${count}` : opt.label,
        };
      }),
    [statusCounts, i18n.language]
  );

  const subtitle = entries.length > 0 ? t('subtitle', { count: entries.length }) : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      {/* Header */}
      <ViewHeader
        icon={LibraryIcon}
        title={t('title')}
        subtitle={subtitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('searchPlaceholder')}
        filters={filtersWithCounts}
        activeFilter={activeFilter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        actions={
          <>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="min-w-[180px] max-w-full h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {tDynamic(i18n, option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={toggleSortOrder}
              tooltip={sortOrder === 'asc' ? t('sort.ascending') : t('sort.descending')}
            >
              <ArrowUpDown
                className={cn('w-4 h-4 transition-transform', sortOrder === 'asc' && 'rotate-180')}
              />
            </TooltipButton>
            <div className="w-px h-4 bg-border-glass mx-1" />
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setIsExportOpen(true)}
              tooltip={t('actions.export')}
            >
              <Download className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setIsImportOpen(true)}
              tooltip={t('actions.import')}
            >
              <Upload className="w-4 h-4" />
            </TooltipButton>
            <div className="w-px h-4 bg-border-glass mx-1" />
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              disabled={!entries.some(e => e.status === 'plan_to_watch')}
              onClick={handleRandomPick}
              tooltip={t('actions.randomPick')}
            >
              <Dices className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant={showStats ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                'w-8 h-8 transition-all duration-200',
                showStats && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              onClick={() => setShowStats(v => !v)}
              tooltip={t('actions.stats')}
            >
              <BarChart3 className="w-4 h-4" />
            </TooltipButton>
          </>
        }
      />

      {/* Stats dashboard */}
      {showStats && <LibraryStats />}

      {/* Content region: kanji watermark in a clipped layer, scroll container on top */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 蔵 (kura: library / storehouse).
            Clipped wrapper keeps the glyph's negative offsets from producing
            scrollbars on either axis. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="蔵" position="br" size={300} opacity={0.03} />
        </div>

        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="relative z-[1] px-7 pt-5 pb-24">
            {isLoading ? (
              <LibrarySkeleton />
            ) : filteredEntries.length === 0 ? (
              searchQuery ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-4 py-24">
                  <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center border border-border-glass">
                    <SearchX className="w-7 h-7 opacity-40" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium text-foreground/70">{t('empty.noResults')}</p>
                    <p className="text-xs text-muted-foreground/60 max-w-[240px]">
                      {t('empty.noResultsHint')}
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={BookOpen}
                  title={t('empty.title')}
                  subtitle={t('empty.subtitle')}
                  action={{
                    label: t('actions.openBrowser'),
                    icon: Globe,
                    onClick: () => navigateTo('browser'),
                  }}
                />
              )
            ) : viewMode === 'grid' ? (
              <div className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(130px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
                {filteredEntries.map(entry => (
                  <AnimeCard
                    key={entry.id}
                    entry={entry}
                    nextAiring={
                      entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null
                    }
                    onSelect={openDetail}
                    onContinue={handleContinue}
                    onRemove={setEntryToRemove}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredEntries.map(entry => (
                  <LibraryListItem
                    key={entry.id}
                    entry={entry}
                    nextAiring={
                      entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null
                    }
                    onClick={() => openDetail(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <AnimeDetailModal
        entry={selectedEntry}
        open={isDetailOpen}
        onOpenChange={open => {
          if (!open) closeDetail();
        }}
      />

      {/* Export/Import dialogs */}
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} type="library" />
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} type="library" />

      {/* Confirm removal dialog (single instance for all cards) */}
      <ConfirmDialog
        open={!!entryToRemove}
        onOpenChange={open => {
          if (!open) setEntryToRemove(null);
        }}
        title={t('remove.title')}
        description={t('remove.descriptionWithTitle', { title: entryToRemove?.title ?? '' })}
        onConfirm={() => {
          if (entryToRemove) {
            removeFromLibrary(entryToRemove.id);
            setEntryToRemove(null);
          }
        }}
      />
    </div>
  );
}
