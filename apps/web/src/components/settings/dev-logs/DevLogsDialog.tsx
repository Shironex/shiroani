import { useTranslation } from 'react-i18next';
import { X, ArrowDown, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FILE_ENTRY_LIMIT } from '@/components/settings/dev-logs/dev-logs-utils';
import { useLogSource } from '@/components/settings/dev-logs/useLogSource';
import { useStickyTail } from '@/components/settings/dev-logs/useStickyTail';
import { DevLogsToolbar } from '@/components/settings/dev-logs/DevLogsToolbar';
import { LogEntryRow } from '@/components/settings/dev-logs/LogEntryRow';

interface DevLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevLogsDialog({ open, onOpenChange }: DevLogsDialogProps) {
  const { t } = useTranslation('settings');

  const logs = useLogSource({ open });
  const stickyTail = useStickyTail({
    tailTrigger: logs.filteredEntries,
    paused: logs.paused,
    resetSignal: logs.resetSignal,
  });

  const { source, filteredEntries, fileTotalCount, totalCountForHeader, showTruncationNote } = logs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-3">
        <DialogHeader>
          <DialogTitle>{t('logs.title')}</DialogTitle>
          <DialogDescription>
            {source === 'buffer'
              ? t('logs.descriptionBuffer', {
                  count: totalCountForHeader,
                  entries: t('logs.entries', { count: totalCountForHeader }),
                })
              : showTruncationNote
                ? t('logs.descriptionTruncated', {
                    limit: FILE_ENTRY_LIMIT,
                    total: fileTotalCount,
                  })
                : t('logs.descriptionFile', {
                    count: totalCountForHeader,
                    entries: t('logs.entries', { count: totalCountForHeader }),
                  })}
          </DialogDescription>
        </DialogHeader>

        <DevLogsToolbar logs={logs} />

        {/* List + optional jump-to-tail button */}
        <div className="relative">
          <div
            ref={stickyTail.listRef}
            onScroll={stickyTail.handleScroll}
            className={cn(
              'max-h-[52vh] overflow-x-hidden overflow-y-auto rounded-lg border border-border-glass bg-background/40',
              'font-mono text-[11px] leading-[1.55]'
            )}
          >
            {logs.fileLoading && source !== 'buffer' ? (
              <div className="p-6 text-center text-muted-foreground text-[12px]">
                {t('logs.loading')}
              </div>
            ) : logs.fileError && source !== 'buffer' ? (
              <div className="p-6 text-center text-destructive text-[12px]">
                <AlertCircle className="w-4 h-4 mx-auto mb-2" />
                {logs.fileError}
              </div>
            ) : !logs.hasAnyEntries ? (
              <div className="p-6 text-center text-muted-foreground text-[12px]">
                <X className="w-4 h-4 mx-auto mb-2 opacity-50" />
                {source === 'buffer' ? t('logs.emptyBuffer') : t('logs.emptyFile')}
              </div>
            ) : !logs.hasFilteredEntries ? (
              <div className="p-6 text-center text-muted-foreground text-[12px]">
                {t('logs.noFilterMatches')}
              </div>
            ) : (
              <ul className="divide-y divide-border-glass/50">
                {filteredEntries.map((entry, i) => (
                  <LogEntryRow
                    key={i}
                    entry={entry}
                    expanded={logs.expanded.has(i)}
                    onToggle={() => logs.toggleExpand(i)}
                  />
                ))}
              </ul>
            )}
          </div>

          {stickyTail.showJumpToTail && logs.hasFilteredEntries && (
            <button
              type="button"
              onClick={stickyTail.jumpToTail}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full border border-border-glass bg-background/90 px-3 py-1 text-[11px] text-foreground shadow-md hover:bg-background"
            >
              <ArrowDown className="w-3 h-3" />
              {t('logs.newEntries')}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
