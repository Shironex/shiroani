import {
  Library as LibraryIcon,
  BookOpen,
  CloudOff,
  Globe,
  RefreshCw,
  SearchX,
  BarChart3,
  Download,
  Upload,
  ArrowUpDown,
  Dices,
  ListChecks,
  CheckSquare,
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
import { AnimeDetailModal } from '@/components/library/AnimeDetailModal';
import { LibraryGrid } from '@/components/library/LibraryGrid';
import { LibraryList } from '@/components/library/LibraryList';
import { LibrarySkeleton } from '@/components/library/LibrarySkeleton';
import { LibraryStats } from '@/components/library/LibraryStats';
import { BatchActionBar } from '@/components/library/BatchActionBar';
import { useTranslation } from 'react-i18next';
import { tDynamic } from '@/lib/i18n';
import { useLibraryView } from './LibraryView.hooks';

const SORT_OPTIONS = [
  { value: 'title', labelKey: 'library:sort.title' },
  { value: 'score', labelKey: 'library:sort.score' },
  { value: 'progress', labelKey: 'library:sort.progress' },
  { value: 'updatedAt', labelKey: 'library:sort.updatedAt' },
] as const;

export default function LibraryView() {
  const { t, i18n } = useTranslation(['library', 'common']);
  const {
    entries,
    activeFilter,
    searchQuery,
    sortBy,
    sortOrder,
    viewMode,
    isLoading,
    error,
    isDetailOpen,
    selectedEntry,
    selectionMode,
    showStats,
    setShowStats,
    entryToRemove,
    setEntryToRemove,
    isExportOpen,
    setIsExportOpen,
    isImportOpen,
    setIsImportOpen,
    nextAiringMap,
    filteredEntries,
    filtersWithCounts,
    subtitle,
    handleSortChange,
    toggleSortOrder,
    handleRandomPick,
    handleContinue,
    handleSelectAllVisible,
    handleRetry,
    handleNavigateToBrowser,
    setFilter,
    setSearchQuery,
    setViewMode,
    openDetail,
    closeDetail,
    removeFromLibrary,
    setSelectionMode,
  } = useLibraryView();

  const sortItems = SORT_OPTIONS.map(option => (
    <SelectItem key={option.value} value={option.value} className="text-xs">
      {tDynamic(i18n, option.labelKey)}
    </SelectItem>
  ));

  // Accessible name for the sort-field combobox: Radix's SelectValue renders the
  // chosen label visually but exposes no `aria-label`, so axe flags the trigger
  // as an unnamed button. Label it with the active sort option's translated text.
  const activeSortLabel = tDynamic(
    i18n,
    SORT_OPTIONS.find(o => o.value === sortBy)?.labelKey ?? 'library:sort.updatedAt'
  );

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
              <SelectTrigger
                aria-label={activeSortLabel}
                className="min-w-[180px] max-w-full h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{sortItems}</SelectContent>
            </Select>
            <TooltipButton
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={toggleSortOrder}
              tooltip={sortOrder === 'asc' ? t('sort.ascending') : t('sort.descending')}
            >
              <ArrowUpDown
                className={cn('w-4 h-4 transition-transform', sortOrder === 'asc' && 'rotate-180')}
              />
            </TooltipButton>
            <div className="w-px h-4 bg-border-glass mx-1 shrink-0" />
            <TooltipButton
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setIsExportOpen(true)}
              tooltip={t('actions.export')}
            >
              <Download className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setIsImportOpen(true)}
              tooltip={t('actions.import')}
            >
              <Upload className="w-4 h-4" />
            </TooltipButton>
            <div className="w-px h-4 bg-border-glass mx-1 shrink-0" />
            {selectionMode && (
              <TooltipButton
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                disabled={filteredEntries.length === 0}
                onClick={handleSelectAllVisible}
                tooltip={t('batch.selectAll')}
              >
                <CheckSquare className="w-4 h-4" />
              </TooltipButton>
            )}
            <TooltipButton
              variant={selectionMode ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                'size-8 shrink-0 transition-colors duration-200',
                selectionMode && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              disabled={entries.length === 0}
              onClick={() => setSelectionMode(!selectionMode)}
              tooltip={t('batch.toggleSelect')}
            >
              <ListChecks className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
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
                'size-8 shrink-0 transition-colors duration-200',
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

        {/* Height-bounded layer hosting the virtualized scroller. The grid/list
            manage their own internal scroll and fill the full height, so content
            scrolls under the floating navigation dock (full-bleed). Dock
            clearance at the *end* of the scroll is handled inside the scroller
            via a trailing spacer row, not by shrinking this viewport. */}
        <div className="absolute inset-0 z-[1] px-7 pt-5 flex flex-col">
          {isLoading ? (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <LibrarySkeleton />
            </div>
          ) : error && entries.length === 0 ? (
            // A failed initial fetch must NOT render the "library is empty"
            // CTA — the user's collection isn't gone, the backend hiccuped.
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EmptyState
                icon={CloudOff}
                title={t('error.title')}
                subtitle={t('error.subtitle')}
                action={{
                  label: t('common:actions.retry'),
                  icon: RefreshCw,
                  onClick: handleRetry,
                }}
              />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {searchQuery ? (
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
                    onClick: handleNavigateToBrowser,
                  }}
                />
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="flex-1 min-h-0">
              <LibraryGrid
                entries={filteredEntries}
                nextAiringMap={nextAiringMap}
                onSelect={openDetail}
                onContinue={handleContinue}
                onRemove={setEntryToRemove}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <LibraryList
                entries={filteredEntries}
                nextAiringMap={nextAiringMap}
                onSelect={openDetail}
              />
            </div>
          )}
        </div>
      </div>

      {/* Batch action bar — bottom dock, only while multi-select mode is active */}
      {selectionMode && <BatchActionBar />}

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
