import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, SearchX, Download, Upload, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useTranslation } from 'react-i18next';
import { tDynamic } from '@/lib/i18n';
import { useDiaryStore, getFilteredDiaryEntries } from '@/stores/useDiaryStore';
import { DiaryEntryGrid } from './DiaryEntryGrid';
import { DiaryTimeline } from './DiaryTimeline';
import { DiarySidebar } from './DiarySidebar';
import { DiaryEditor } from './DiaryEditor';
import type { DiaryEntry } from '@shiroani/shared';
import type { DiarySortBy } from '@/stores/useDiaryStore';

const DIARY_FILTER_OPTIONS = [
  { value: 'all' as const, labelKey: 'filter.all' },
  { value: 'pinned' as const, labelKey: 'filter.pinned' },
  { value: 'with_anime' as const, labelKey: 'filter.withAnime' },
];

const DIARY_SORT_OPTIONS = [
  { value: 'createdAt', labelKey: 'sort.createdAt' },
  { value: 'updatedAt', labelKey: 'sort.updatedAt' },
  { value: 'title', labelKey: 'sort.title' },
] as const;

const {
  setFilter,
  setSearchQuery,
  setViewMode,
  setSort,
  openEditor,
  closeEditor,
  createEntry,
  updateEntry,
  removeEntry,
  fetchEntries,
  initListeners,
  cleanupListeners,
} = useDiaryStore.getState();

/**
 * Diary view — editorial redesign (Phase 5).
 *
 * Layout matches `shiroani-design/Diary.html`:
 *   - `ViewHeader` with `NotebookPen` icon, entry count subtitle, sort/import/export
 *     actions and the "Nowy wpis" button.
 *   - A two-column body: a vertical `<DiaryTimeline/>` on the left and a
 *     stat/streak `<DiarySidebar/>` on the right (320px). Grid view (card
 *     layout from `DiaryEntryGrid`) is still available via the view-mode
 *     toggle.
 *   - Decorative 録 kanji watermark sits behind the scroll area using the
 *     clipped-layer pattern from `SettingsView`.
 *
 * Store wiring (pin, filter, sort, search, import/export, editor lifecycle)
 * is preserved exactly as before the redesign.
 */
export function DiaryView() {
  const { t, i18n } = useTranslation('diary');
  const entries = useDiaryStore(s => s.entries);
  const activeFilter = useDiaryStore(s => s.activeFilter);
  const searchQuery = useDiaryStore(s => s.searchQuery);
  const viewMode = useDiaryStore(s => s.viewMode);
  const sortBy = useDiaryStore(s => s.sortBy);
  const sortOrder = useDiaryStore(s => s.sortOrder);
  const isEditorOpen = useDiaryStore(s => s.isEditorOpen);
  const selectedEntry = useDiaryStore(s => s.selectedEntry);

  const [entryToRemove, setEntryToRemove] = useState<DiaryEntry | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleSortChange = useCallback(
    (value: string) => {
      setSort(value as DiarySortBy, sortOrder);
    },
    [sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortBy, sortOrder]);

  const handleTogglePin = useCallback(
    (e: DiaryEntry) => updateEntry({ id: e.id, isPinned: !e.isPinned }),
    []
  );

  useEffect(() => {
    initListeners();
    fetchEntries();
    return () => cleanupListeners();
  }, [initListeners, fetchEntries, cleanupListeners]);

  const filteredEntries = useMemo(
    () => getFilteredDiaryEntries({ entries, activeFilter, searchQuery, sortBy, sortOrder }),
    [entries, activeFilter, searchQuery, sortBy, sortOrder]
  );

  const subtitle = entries.length > 0 ? t('subtitle', { count: entries.length }) : undefined;

  const localizedFilterOptions = useMemo(
    () =>
      DIARY_FILTER_OPTIONS.map(opt => ({
        value: opt.value,
        label: tDynamic(i18n, `diary:${opt.labelKey}`),
      })),
    [i18n, i18n.language]
  );

  const isEmpty = filteredEntries.length === 0;

  // When the editor is open, it replaces the diary's body (and header) with
  // an in-place "page" — no modal, no dialog. Back button inside the editor
  // returns us here.
  if (isEditorOpen) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
        <DiaryEditor
          entry={selectedEntry}
          onClose={closeEditor}
          onCreate={createEntry}
          onUpdate={updateEntry}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <ViewHeader
        icon={NotebookPen}
        title={t('title')}
        subtitle={subtitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('searchPlaceholder')}
        filters={localizedFilterOptions}
        activeFilter={activeFilter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        actions={
          <>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="min-w-[170px] max-w-full h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIARY_SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {tDynamic(i18n, `diary:${option.labelKey}`)}
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
            <div className="w-px h-4 bg-border/50 mx-1" />
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEditor()}>
              <Plus className="w-3.5 h-3.5" />
              {t('actions.newEntry')}
            </Button>
            <div className="w-px h-4 bg-border/50 mx-1" />
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
          </>
        }
      />

      {/* Body — clipped layer hosts the 録 watermark so its offsets
          don't leak into the scroll container. Main and sidebar scroll
          independently so the sidebar stays visible while the entry list
          scrolls (mock behaviour). */}
      <div className="relative flex-1 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="録" position="br" size={280} opacity={0.03} />
        </div>

        <div
          className={cn('absolute inset-0 grid', 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]')}
        >
          {/* Main column — independent scroll */}
          <div className="overflow-y-auto overflow-x-hidden">
            <div className="min-w-0 px-7 pt-6 pb-24">
              {isEmpty ? (
                searchQuery ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
                    <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center border border-border-glass">
                      <SearchX className="w-7 h-7 opacity-40" />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-medium text-foreground/70">
                        {t('empty.noResults')}
                      </p>
                      <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                        {t('empty.noResultsHint')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={NotebookPen}
                    title={t('empty.title')}
                    subtitle={t('empty.subtitle')}
                    action={{
                      label: t('empty.action'),
                      icon: Plus,
                      onClick: () => openEditor(),
                    }}
                  />
                )
              ) : viewMode === 'grid' ? (
                <DiaryEntryGrid
                  entries={filteredEntries}
                  viewMode="grid"
                  onSelect={openEditor}
                  onRemove={setEntryToRemove}
                  onTogglePin={handleTogglePin}
                />
              ) : (
                <DiaryTimeline
                  entries={filteredEntries}
                  onSelect={openEditor}
                  onRemove={setEntryToRemove}
                  onTogglePin={handleTogglePin}
                />
              )}
            </div>
          </div>

          {/* Sidebar column — independent scroll, full-height, visible border */}
          <div className="hidden lg:block overflow-y-auto overflow-x-hidden border-l border-border-glass bg-foreground/[0.015]">
            <DiarySidebar entries={entries} />
          </div>
        </div>
      </div>

      {/* Export/Import dialogs */}
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} type="diary" />
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} type="diary" />

      {/* Confirm removal dialog */}
      <ConfirmDialog
        open={!!entryToRemove}
        onOpenChange={open => {
          if (!open) setEntryToRemove(null);
        }}
        title={t('remove.title')}
        description={t('remove.description', {
          title: entryToRemove?.title || t('untitled'),
        })}
        onConfirm={() => {
          if (entryToRemove) {
            removeEntry(entryToRemove.id);
            setEntryToRemove(null);
          }
        }}
      />
    </div>
  );
}
