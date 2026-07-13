import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type LogLevelName, prettyPrintData } from '@/components/settings/dev-logs/dev-logs-utils';
import { useLogEntryRow } from './LogEntryRow.hooks';
import type { ILogEntryRowProps } from './LogEntryRow.types';

const LEVEL_STYLES: Record<LogLevelName, string> = {
  error: 'bg-destructive/15 text-destructive',
  warn: 'bg-[oklch(from_var(--status-warning)_l_c_h/0.15)] text-status-warning',
  info: 'bg-primary/15 text-primary',
  debug: 'bg-foreground/[0.08] text-muted-foreground',
};

/** A single log line: level pill + timestamp + context + message, with an
 * optional expandable data block when the entry carries structured data. */
export default function LogEntryRow({ entry, expanded, onToggle }: ILogEntryRowProps) {
  const { t } = useTranslation('settings');
  useLogEntryRow();
  const hasData = entry.data !== undefined;
  const showDataBlock = hasData && expanded;

  return (
    <li className="flex flex-col gap-1 px-2.5 py-1.5 hover:bg-foreground/[0.02]">
      <div className="flex gap-2 items-start">
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
            LEVEL_STYLES[entry.level]
          )}
        >
          {entry.level}
        </span>
        <span className="shrink-0 text-muted-foreground/80 tabular-nums">
          {entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp}
        </span>
        <span className="shrink-0 text-muted-foreground/80">[{entry.context}]</span>
        <span className="min-w-0 flex-1 break-words text-foreground/90">
          {entry.message}
          {hasData && (
            <button
              type="button"
              onClick={onToggle}
              className="ml-2 inline-flex items-center gap-0.5 rounded border border-border-glass px-1 text-[10px] text-muted-foreground hover:text-foreground"
              aria-expanded={expanded}
              aria-label={expanded ? t('logs.showLessData') : t('logs.showMoreData')}
            >
              <ChevronRight
                className={cn('w-2.5 h-2.5 transition-transform', expanded && 'rotate-90')}
              />
              {t('logs.data')}
            </button>
          )}
        </span>
      </div>
      {showDataBlock && (
        <pre className="ml-[calc(2.5rem)] max-w-full whitespace-pre-wrap break-all rounded border border-border-glass/60 bg-foreground/[0.03] p-2 text-[10.5px] text-muted-foreground">
          {prettyPrintData(entry.data)}
        </pre>
      )}
    </li>
  );
}
