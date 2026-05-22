import { useTranslation } from 'react-i18next';
import { Copy, Trash2, Check, Download, Pause, Play } from 'lucide-react';
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
import { type LevelFilter, formatFileDate } from '@/components/settings/dev-logs/dev-logs-utils';
import type { LogSource } from '@/components/settings/dev-logs/useLogSource';

interface DevLogsToolbarProps {
  logs: LogSource;
}

/** All controls above the log list: source selector, archive picker, level +
 * text filters, runtime log level, and the pause/copy/export/clear actions. */
export function DevLogsToolbar({ logs }: DevLogsToolbarProps) {
  const { t } = useTranslation('settings');
  const { source } = logs;

  return (
    <>
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
        <Select value={logs.levelFilter} onValueChange={v => logs.setLevelFilter(v as LevelFilter)}>
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
            <span className="text-[11px] text-primary inline-flex items-center gap-1" role="status">
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
    </>
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
