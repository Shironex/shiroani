import { NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { DiarySidebar } from '../DiarySidebar';
import { DiaryEditor } from '../DiaryEditor';
import { useDiaryView } from './DiaryView.hooks';
import { DiaryBody, HeaderActions } from './DiaryView.parts';

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
export default function DiaryView() {
  const {
    t,
    entries,
    activeFilter,
    searchQuery,
    viewMode,
    sortBy,
    sortOrder,
    isEditorOpen,
    selectedEntry,
    isLoading,
    error,
    entryToRemove,
    setEntryToRemove,
    isExportOpen,
    setIsExportOpen,
    isImportOpen,
    setIsImportOpen,
    filteredEntries,
    subtitle,
    localizedFilterOptions,
    isEmpty,
    sortOptions,
    resolveSortLabel,
    handleSortChange,
    toggleSortOrder,
    handleTogglePin,
    setFilter,
    setSearchQuery,
    setViewMode,
    openEditor,
    closeEditor,
    createEntry,
    updateEntry,
    removeEntry,
    fetchEntries,
  } = useDiaryView();

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
          <HeaderActions
            t={t}
            sortBy={sortBy}
            sortOrder={sortOrder}
            sortOptions={sortOptions}
            resolveSortLabel={resolveSortLabel}
            onSortChange={handleSortChange}
            onToggleSortOrder={toggleSortOrder}
            onNewEntry={() => openEditor()}
            onExport={() => setIsExportOpen(true)}
            onImport={() => setIsImportOpen(true)}
          />
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
              <DiaryBody
                t={t}
                isLoading={isLoading}
                error={error}
                entriesCount={entries.length}
                isEmpty={isEmpty}
                searchQuery={searchQuery}
                viewMode={viewMode}
                filteredEntries={filteredEntries}
                onRetry={fetchEntries}
                onSelect={openEditor}
                onRemove={setEntryToRemove}
                onTogglePin={handleTogglePin}
                onNewEntry={() => openEditor()}
              />
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
