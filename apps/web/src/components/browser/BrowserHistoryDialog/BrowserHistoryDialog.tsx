import { useTranslation } from 'react-i18next';
import { Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useBrowserHistoryDialog } from './BrowserHistoryDialog.hooks';
import { HistoryRow } from './BrowserHistoryDialog.parts';
import type { IBrowserHistoryDialogProps } from './BrowserHistoryDialog.types';

/**
 * Browsing-history view: searchable list of chronological visits with
 * per-entry delete and a "clear all" action. Selective clears are distinct
 * from the global Settings → Data "delete all" wipe — this only touches the
 * history slice.
 */
export default function BrowserHistoryDialog({
  open,
  onOpenChange,
  onNavigate,
}: IBrowserHistoryDialogProps) {
  const { t } = useTranslation('browser');
  const {
    history,
    filtered,
    query,
    setQuery,
    handleOpen,
    removeHistoryEntry,
    clearHistory,
    removeLabel,
  } = useBrowserHistoryDialog(onOpenChange, onNavigate);

  const rows = filtered.map(entry => (
    <HistoryRow
      key={entry.id}
      entry={entry}
      onOpen={handleOpen}
      onRemove={removeHistoryEntry}
      removeLabel={removeLabel}
    />
  ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('history.title')}</DialogTitle>
          <DialogDescription>{t('history.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-full border border-border-glass bg-foreground/[0.05] px-3 h-9">
          <Search className="size-3.5 shrink-0 text-muted-foreground/70" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            aria-label={t('history.searchAria')}
            className="h-6 flex-1 border-0 bg-transparent px-0 text-[12.5px] focus-visible:ring-0 focus-visible:bg-transparent"
          />
        </div>

        <div className={cn('mt-1 max-h-[50vh] overflow-y-auto', filtered.length === 0 && 'py-6')}>
          {filtered.length > 0 ? (
            <ul className="flex flex-col gap-0.5">{rows}</ul>
          ) : (
            <p className="text-center text-[12px] text-muted-foreground">
              {query.trim() ? t('history.noResults') : t('history.empty')}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            disabled={history.length === 0}
            className="text-muted-foreground hover:text-status-error"
          >
            <Trash2 className="size-3.5" />
            {t('history.clearAll')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
