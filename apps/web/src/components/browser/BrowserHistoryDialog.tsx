import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { Globe, Search, Trash2, X } from 'lucide-react';
import type { BrowserHistoryEntry } from '@shiroani/shared';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { hostFromUrl } from '@/lib/url-utils';
import { formatRelativeTime } from '@/lib/relative-time';
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

interface BrowserHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Navigate the active pane to a chosen history entry. */
  onNavigate: (url: string) => void;
}

interface HistoryRowProps {
  entry: BrowserHistoryEntry;
  onOpen: (url: string) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
}

const HistoryRow = memo(function HistoryRow({
  entry,
  onOpen,
  onRemove,
  removeLabel,
}: HistoryRowProps) {
  const { t } = useTranslation('browser');
  const host = hostFromUrl(entry.url) ?? entry.url;
  return (
    <li className="group flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 hover:bg-foreground/[0.05]">
      <button
        type="button"
        onClick={() => onOpen(entry.url)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
      >
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="size-4 shrink-0 rounded-sm" />
        ) : (
          <Globe className="size-4 shrink-0 text-muted-foreground/70" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] text-foreground/90 leading-tight">
            {entry.title || host}
          </div>
          <div className="truncate font-mono text-[10px] text-muted-foreground leading-tight">
            {host}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
          {formatRelativeTime(entry.visitedAt, t)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label={removeLabel}
        className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-status-error group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
});

/**
 * Browsing-history view: searchable list of chronological visits with
 * per-entry delete and a "clear all" action. Selective clears are distinct
 * from the global Settings → Data "delete all" wipe — this only touches the
 * history slice.
 */
export function BrowserHistoryDialog({
  open,
  onOpenChange,
  onNavigate,
}: BrowserHistoryDialogProps) {
  const { t } = useTranslation('browser');
  const history = useBrowserStore(useShallow(s => s.history));
  const { removeHistoryEntry, clearHistory } = useBrowserStore.getState();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      e => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
    );
  }, [history, query]);

  const handleOpen = useCallback(
    (url: string) => {
      onNavigate(url);
      onOpenChange(false);
    },
    [onNavigate, onOpenChange]
  );

  const removeLabel = t('history.removeEntry');

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
            <ul className="flex flex-col gap-0.5">
              {filtered.map(entry => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  onOpen={handleOpen}
                  onRemove={removeHistoryEntry}
                  removeLabel={removeLabel}
                />
              ))}
            </ul>
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
