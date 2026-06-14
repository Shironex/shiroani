import type { TFunction } from 'i18next';
import {
  CloudOff,
  NotebookPen,
  Plus,
  RefreshCw,
  SearchX,
  Download,
  Upload,
  ArrowUpDown,
} from 'lucide-react';
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
import { EmptyState } from '@/components/shared/EmptyState';
import type { DiaryEntry } from '@shiroani/shared';
import type { DiarySortBy } from '@/stores/useDiaryStore';
import { DiaryEntryGrid } from '../DiaryEntryGrid';
import { DiarySkeleton } from '../DiarySkeleton';
import { DiaryTimeline } from '../DiaryTimeline';
import type { IDiarySortOption } from './DiaryView.types';

interface IHeaderActionsProps {
  t: TFunction<['diary', 'common']>;
  sortBy: DiarySortBy;
  sortOrder: 'asc' | 'desc';
  sortOptions: readonly IDiarySortOption[];
  resolveSortLabel: (labelKey: string) => string;
  onSortChange: (value: string) => void;
  onToggleSortOrder: () => void;
  onNewEntry: () => void;
  onExport: () => void;
  onImport: () => void;
}

/** The view-header action cluster: sort select/toggle, new-entry, import/export. */
export function HeaderActions({
  t,
  sortBy,
  sortOrder,
  sortOptions,
  resolveSortLabel,
  onSortChange,
  onToggleSortOrder,
  onNewEntry,
  onExport,
  onImport,
}: IHeaderActionsProps) {
  return (
    <>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="min-w-[170px] max-w-full h-8 text-xs bg-background/40 border-border-glass focus:bg-background/60 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map(option => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {resolveSortLabel(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={onToggleSortOrder}
        tooltip={sortOrder === 'asc' ? t('sort.ascending') : t('sort.descending')}
      >
        <ArrowUpDown
          className={cn('w-4 h-4 transition-transform', sortOrder === 'asc' && 'rotate-180')}
        />
      </TooltipButton>
      <div className="w-px h-4 bg-border/50 mx-1 shrink-0" />
      <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={onNewEntry}>
        <Plus className="w-3.5 h-3.5" />
        {t('actions.newEntry')}
      </Button>
      <div className="w-px h-4 bg-border/50 mx-1 shrink-0" />
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={onExport}
        tooltip={t('actions.export')}
      >
        <Download className="w-4 h-4" />
      </TooltipButton>
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={onImport}
        tooltip={t('actions.import')}
      >
        <Upload className="w-4 h-4" />
      </TooltipButton>
    </>
  );
}

interface IDiaryBodyProps {
  t: TFunction<['diary', 'common']>;
  isLoading: boolean;
  error: string | null;
  entriesCount: number;
  isEmpty: boolean;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  filteredEntries: DiaryEntry[];
  onRetry: () => void;
  onSelect: (entry?: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
  onNewEntry: () => void;
}

/** The main column body: skeleton, error, empty, no-results, grid or timeline. */
export function DiaryBody({
  t,
  isLoading,
  error,
  entriesCount,
  isEmpty,
  searchQuery,
  viewMode,
  filteredEntries,
  onRetry,
  onSelect,
  onRemove,
  onTogglePin,
  onNewEntry,
}: IDiaryBodyProps) {
  if (isLoading && entriesCount === 0) {
    return <DiarySkeleton />;
  }

  if (error && entriesCount === 0) {
    // A failed initial fetch must NOT render the "create your first entry" CTA —
    // the entries aren't gone, the fetch failed.
    return (
      <EmptyState
        icon={CloudOff}
        title={t('error.title')}
        subtitle={t('error.subtitle')}
        action={{
          label: t('common:actions.retry'),
          icon: RefreshCw,
          onClick: onRetry,
        }}
      />
    );
  }

  if (isEmpty) {
    if (searchQuery) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center border border-border-glass">
            <SearchX className="w-7 h-7 opacity-40" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-sm font-medium text-foreground/70">{t('empty.noResults')}</p>
            <p className="text-xs text-muted-foreground/60 max-w-[200px]">
              {t('empty.noResultsHint')}
            </p>
          </div>
        </div>
      );
    }
    return (
      <EmptyState
        icon={NotebookPen}
        title={t('empty.title')}
        subtitle={t('empty.subtitle')}
        action={{
          label: t('empty.action'),
          icon: Plus,
          onClick: onNewEntry,
        }}
      />
    );
  }

  if (viewMode === 'grid') {
    return (
      <DiaryEntryGrid
        entries={filteredEntries}
        viewMode="grid"
        onSelect={onSelect}
        onRemove={onRemove}
        onTogglePin={onTogglePin}
      />
    );
  }

  return (
    <DiaryTimeline
      entries={filteredEntries}
      onSelect={onSelect}
      onRemove={onRemove}
      onTogglePin={onTogglePin}
    />
  );
}
