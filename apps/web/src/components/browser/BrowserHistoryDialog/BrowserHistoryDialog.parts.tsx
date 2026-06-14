import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, X } from 'lucide-react';
import { hostFromUrl } from '@/lib/url-utils';
import { formatRelativeTime } from '@/lib/relative-time';
import type { IHistoryRowProps } from './BrowserHistoryDialog.types';

export const HistoryRow = memo(function HistoryRow({
  entry,
  onOpen,
  onRemove,
  removeLabel,
}: IHistoryRowProps) {
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
