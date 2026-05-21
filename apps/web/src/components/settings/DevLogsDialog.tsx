import { useTranslation } from 'react-i18next';
import {
  Copy,
  Trash2,
  Check,
  X,
  Download,
  Pause,
  Play,
  ArrowDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format-bytes';
import {
  type LevelFilter,
  type LogLevelName,
  FILE_ENTRY_LIMIT,
  formatFileDate,
  prettyPrintData,
} from './dev-logs-utils';
import { useLogSource } from './useLogSource';
import { useStickyTail } from './useStickyTail';

interface DevLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEVEL_STYLES: Record<LogLevelName, string> = {
  error: 'bg-destructive/15 text-destructive',
  warn: 'bg-[oklch(0.8_0.14_70/0.15)] text-[oklch(0.8_0.14_70)]',
  info: 'bg-primary/15 text-primary',
  debug: 'bg-foreground/[0.08] text-muted-foreground',
};

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

        {/* Source selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border-glass bg-background/40 p-0.5 text-[11.5px] self-start">
          <SourceButton
            active={source === 'buffer'}
            onClick={() => logs.handleSourceChange('buffer')}
            label={t('logs.source.buffer')}
          />
          <SourceButton
            active={source === 'today'}
            onClick={() => logs.handleSourceChange('today')}
            label={t('logs.source.today')}
          />
          <SourceButton
            active={source === 'archive'}
            onClick={() => logs.handleSourceChange('archive')}
            label={t('logs.source.archive')}
          />
        </div>

        {/* Archive dropdown (only in archive mode) */}
        {source === 'archive' && (
          <div className="flex items-center gap-2">
            <label className="text-[11.5px] text-muted-foreground shrink-0">
              {t('logs.filePicker.label')}
            </label>
            <Select
              value={logs.selectedArchive ?? undefined}
              onValueChange={logs.handleArchiveSelect}
              disabled={logs.fileList.length === 0}
            >
              <SelectTrigger className="h-8 text-[12px] max-w-md">
                <SelectValue
                  placeholder={
                    logs.fileList.length === 0
                      ? t('logs.filePicker.noFiles')
                      : t('logs.filePicker.placeholder')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {logs.fileList.map(file => (
                  <SelectItem key={file.name} value={file.name}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{file.name}</span>
                      <span className="text-muted-foreground/70 text-[11px]">
                        {formatBytes(file.size)} · {formatFileDate(file.lastModified)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Toolbar: filters + actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level filter */}
          <Select
            value={logs.levelFilter}
            onValueChange={v => logs.setLevelFilter(v as LevelFilter)}
          >
            <SelectTrigger className="h-8 w-[130px] text-[12px]" aria-label={t('logs.filterAria')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('logs.level.all')}</SelectItem>
              <SelectItem value="error">{t('logs.level.error')}</SelectItem>
              <SelectItem value="warn">{t('logs.level.warn')}</SelectItem>
              <SelectItem value="info">{t('logs.level.info')}</SelectItem>
              <SelectItem value="debug">{t('logs.level.debug')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <Input
            type="search"
            value={logs.searchInput}
            onChange={e => logs.setSearchInput(e.target.value)}
            placeholder={t('logs.searchPlaceholder')}
            className="h-8 max-w-xs"
            aria-label={t('logs.searchAria')}
          />

          {/* Runtime log level */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11.5px] text-muted-foreground">{t('logs.levelLabel')}</span>
            <Select value={logs.runtimeLevel} onValueChange={logs.handleRuntimeLevelChange}>
              <SelectTrigger
                className="h-8 w-[100px] text-[12px]"
                aria-label={t('logs.runtimeLevelAria')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="error">{t('logs.level.error')}</SelectItem>
                <SelectItem value="warn">{t('logs.level.warn')}</SelectItem>
                <SelectItem value="info">{t('logs.level.info')}</SelectItem>
                <SelectItem value="debug">{t('logs.level.debug')}</SelectItem>
              </SelectContent>
            </Select>
            {logs.levelChangedAt !== null && (
              <span
                className="text-[11px] text-primary inline-flex items-center gap-1"
                role="status"
              >
                <Check className="w-3 h-3" />
                {t('logs.levelChanged')}
              </span>
            )}
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={logs.handleTogglePause}
            disabled={source !== 'buffer'}
            aria-label={logs.paused ? t('logs.resume') : t('logs.pause')}
          >
            {logs.paused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                {t('logs.resume')}
                {logs.pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                    {t('logs.newCount', { count: logs.pendingCount })}
                  </span>
                )}
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                {t('logs.pause')}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={logs.handleCopy}
            disabled={!logs.hasFilteredEntries}
          >
            {logs.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {logs.copied ? t('logs.copied') : t('logs.copyAll')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={logs.handleExport}
            disabled={!logs.hasFilteredEntries}
          >
            <Download className="w-3.5 h-3.5" />
            {t('logs.export')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={logs.handleClear}
            disabled={!logs.hasAnyEntries}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('logs.clear')}
          </Button>
        </div>

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
                {filteredEntries.map((entry, i) => {
                  const isOpen = logs.expanded.has(i);
                  const hasData = entry.data !== undefined;
                  return (
                    <li
                      key={i}
                      className="flex flex-col gap-1 px-2.5 py-1.5 hover:bg-foreground/[0.02]"
                    >
                      <div className="flex gap-2 items-start">
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
                            LEVEL_STYLES[entry.level]
                          )}
                        >
                          {entry.level}
                        </span>
                        <span className="shrink-0 text-muted-foreground/60 tabular-nums">
                          {entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp}
                        </span>
                        <span className="shrink-0 text-muted-foreground/80">[{entry.context}]</span>
                        <span className="min-w-0 flex-1 break-words text-foreground/90">
                          {entry.message}
                          {hasData && (
                            <button
                              type="button"
                              onClick={() => logs.toggleExpand(i)}
                              className="ml-2 inline-flex items-center gap-0.5 rounded border border-border-glass px-1 text-[10px] text-muted-foreground hover:text-foreground"
                              aria-expanded={isOpen}
                              aria-label={isOpen ? t('logs.showLessData') : t('logs.showMoreData')}
                            >
                              <ChevronRight
                                className={cn(
                                  'w-2.5 h-2.5 transition-transform',
                                  isOpen && 'rotate-90'
                                )}
                              />
                              dane
                            </button>
                          )}
                        </span>
                      </div>
                      {hasData && isOpen && (
                        <pre className="ml-[calc(2.5rem)] max-w-full whitespace-pre-wrap break-all rounded border border-border-glass/60 bg-foreground/[0.03] p-2 text-[10.5px] text-muted-foreground">
                          {prettyPrintData(entry.data)}
                        </pre>
                      )}
                    </li>
                  );
                })}
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

function SourceButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md px-2.5 py-1 font-medium transition-colors',
        active
          ? 'bg-foreground/[0.08] text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}
