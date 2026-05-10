import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
  getLogBuffer,
  subscribeToLogBuffer,
  clearLogBuffer,
  getLogLevel,
  setLogLevel,
  LogLevel,
  type LogEntry,
} from '@shiroani/shared';
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

interface DevLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LogLevelName = 'error' | 'warn' | 'info' | 'debug';
type SourceMode = 'buffer' | 'today' | 'archive';
type LevelFilter = 'all' | LogLevelName;

interface LogFileInfo {
  name: string;
  size: number;
  lastModified: number;
}

const LEVEL_STYLES: Record<LogLevelName, string> = {
  error: 'bg-destructive/15 text-destructive',
  warn: 'bg-[oklch(0.8_0.14_70/0.15)] text-[oklch(0.8_0.14_70)]',
  info: 'bg-primary/15 text-primary',
  debug: 'bg-foreground/[0.08] text-muted-foreground',
};

const LEVEL_TO_NAME: Record<LogLevel, LogLevelName> = {
  [LogLevel.ERROR]: 'error',
  [LogLevel.WARN]: 'warn',
  [LogLevel.INFO]: 'info',
  [LogLevel.DEBUG]: 'debug',
};

const FILE_ENTRY_LIMIT = 2000;
const SCROLL_STICKY_THRESHOLD = 20;
const SEARCH_DEBOUNCE_MS = 150;
const LEVEL_CHANGE_TOAST_MS = 2000;

export function DevLogsDialog({ open, onOpenChange }: DevLogsDialogProps) {
  const { t } = useTranslation('settings');
  // Source / data state
  const [source, setSource] = useState<SourceMode>('buffer');
  const [bufferEntries, setBufferEntries] = useState<readonly LogEntry[]>(() => getLogBuffer());
  const [fileEntries, setFileEntries] = useState<readonly LogEntry[]>([]);
  const [fileTotalCount, setFileTotalCount] = useState(0);
  const [fileList, setFileList] = useState<LogFileInfo[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Filters
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Runtime log level
  const [runtimeLevel, setRuntimeLevel] = useState<LogLevelName>(
    () => LEVEL_TO_NAME[getLogLevel()]
  );
  const [levelChangedAt, setLevelChangedAt] = useState<number | null>(null);

  // Pause / sticky-tail
  const [paused, setPaused] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpToTail, setShowJumpToTail] = useState(false);

  // Copy / expand
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const listRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // ── Debounce text search ────────────────────────────────────────────
  useEffect(() => {
    const handle = window.setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // ── Reset transient UI state when reopening ─────────────────────────
  useEffect(() => {
    if (!open) return;
    setRuntimeLevel(LEVEL_TO_NAME[getLogLevel()]);
    setExpanded(new Set());
    setPendingCount(0);
    setPaused(false);
    setAutoScroll(true);
    setShowJumpToTail(false);
  }, [open]);

  // ── Subscribe to live buffer when in buffer mode ────────────────────
  //
  // The buffer is a ring, so `next.length` stays flat once capacity is
  // reached; counting callbacks (each representing one push) is the only
  // reliable way to track "how many new entries while paused".
  useEffect(() => {
    if (!open || source !== 'buffer') return;
    setBufferEntries(getLogBuffer());
    const unsubscribe = subscribeToLogBuffer(next => {
      if (pausedRef.current) {
        setPendingCount(c => c + 1);
        return;
      }
      setBufferEntries(next);
    });
    return unsubscribe;
  }, [open, source]);

  // ── Load file list when switching to file-based sources ─────────────
  useEffect(() => {
    if (!open) return;
    if (source === 'buffer') return;

    const api = window.electronAPI?.app;
    if (!api?.listLogFiles || !api?.readLogFile) {
      setFileError(t('logs.logsUnavailable'));
      setFileList([]);
      setFileEntries([]);
      return;
    }

    setFileError(null);
    setFileLoading(true);
    api
      .listLogFiles()
      .then(files => {
        const sorted = [...files].sort((a, b) => b.lastModified - a.lastModified);
        setFileList(sorted);
        if (source === 'today') {
          const latest = sorted[0];
          if (!latest) {
            setFileError(t('logs.noFilesError'));
            setFileEntries([]);
            setFileTotalCount(0);
            return;
          }
          void loadFileContents(latest.name);
        } else if (source === 'archive') {
          // Keep previous selection if still present, otherwise leave empty.
          if (selectedArchive && sorted.some(f => f.name === selectedArchive)) {
            void loadFileContents(selectedArchive);
          } else {
            setFileEntries([]);
            setFileTotalCount(0);
          }
        }
      })
      .catch((err: unknown) => {
        setFileError(describeError(err, t));
        setFileList([]);
        setFileEntries([]);
      })
      .finally(() => setFileLoading(false));
  }, [open, source, t]);

  const loadFileContents = useCallback(
    async (fileName: string) => {
      const api = window.electronAPI?.app;
      if (!api?.readLogFile) {
        setFileError(t('logs.logsUnavailable'));
        return;
      }
      setFileLoading(true);
      setFileError(null);
      try {
        const contents = await api.readLogFile(fileName);
        const parsed = parseJsonlLogEntries(contents);
        setFileTotalCount(parsed.length);
        if (parsed.length > FILE_ENTRY_LIMIT) {
          setFileEntries(parsed.slice(parsed.length - FILE_ENTRY_LIMIT));
        } else {
          setFileEntries(parsed);
        }
      } catch (err) {
        setFileError(describeError(err, t));
        setFileEntries([]);
        setFileTotalCount(0);
      } finally {
        setFileLoading(false);
      }
    },
    [t]
  );

  // ── Active entries (pre-filter) ─────────────────────────────────────
  const activeEntries = source === 'buffer' ? bufferEntries : fileEntries;

  // ── Filter pipeline ─────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (levelFilter === 'all' && q.length === 0) return activeEntries;
    return activeEntries.filter(entry => {
      if (levelFilter !== 'all' && entry.level !== levelFilter) return false;
      if (q.length === 0) return true;
      const haystack =
        entry.message.toLowerCase() +
        '\n' +
        entry.context.toLowerCase() +
        '\n' +
        (entry.data === undefined ? '' : stringifyData(entry.data).toLowerCase());
      return haystack.includes(q);
    });
  }, [activeEntries, levelFilter, searchQuery]);

  // ── Auto-scroll when new filtered entries arrive ────────────────────
  useEffect(() => {
    if (!listRef.current) return;
    if (paused) return;
    if (!autoScroll) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filteredEntries, paused, autoScroll]);

  // ── Scroll handler: detect user scrolling up to pause auto-scroll ───
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= SCROLL_STICKY_THRESHOLD;
    if (nearBottom) {
      if (!autoScroll) setAutoScroll(true);
      if (showJumpToTail) setShowJumpToTail(false);
    } else {
      if (autoScroll) setAutoScroll(false);
      if (!showJumpToTail) setShowJumpToTail(true);
    }
  }, [autoScroll, showJumpToTail]);

  // ── Level change toast auto-dismiss ─────────────────────────────────
  useEffect(() => {
    if (levelChangedAt === null) return;
    const handle = window.setTimeout(() => setLevelChangedAt(null), LEVEL_CHANGE_TOAST_MS);
    return () => window.clearTimeout(handle);
  }, [levelChangedAt]);

  // ── Derived strings / handlers ──────────────────────────────────────
  const formattedForCopy = useMemo(
    () => filteredEntries.map(formatLine).join('\n'),
    [filteredEntries]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedForCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      await window.electronAPI?.app?.clipboardWrite?.(formattedForCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleExport = () => {
    const jsonl = filteredEntries.map(e => JSON.stringify(e)).join('\n');
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shiroani-logs-${formatDownloadStamp(new Date())}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release after a short delay so the download can complete.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleClear = () => {
    if (source === 'buffer') {
      clearLogBuffer();
      setPendingCount(0);
    } else {
      // For file mode, "clear" just empties the currently loaded view.
      setFileEntries([]);
      setFileTotalCount(0);
    }
    setExpanded(new Set());
  };

  const handleTogglePause = () => {
    if (paused) {
      // Resume: pull the latest buffer snapshot so queued entries appear.
      if (source === 'buffer') {
        setBufferEntries(getLogBuffer());
      }
      setPendingCount(0);
      setPaused(false);
      setAutoScroll(true);
      setShowJumpToTail(false);
    } else {
      setPaused(true);
    }
  };

  const handleJumpToTail = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
    setShowJumpToTail(false);
  };

  const handleRuntimeLevelChange = async (value: string) => {
    const next = value as LogLevelName;
    setRuntimeLevel(next);
    // Apply locally so renderer matches immediately.
    setLogLevel(next);
    try {
      await window.electronAPI?.app?.setLogLevel?.(next);
      setLevelChangedAt(Date.now());
    } catch {
      // Best-effort: local change still applied. Surface via toast line.
      setLevelChangedAt(Date.now());
    }
  };

  const handleSourceChange = (next: SourceMode) => {
    if (next === source) return;
    setSource(next);
    // Reset transient per-source state.
    setPendingCount(0);
    setPaused(false);
    setAutoScroll(true);
    setShowJumpToTail(false);
    setExpanded(new Set());
    setFileError(null);
    if (next === 'buffer') {
      setBufferEntries(getLogBuffer());
    }
  };

  const handleArchiveSelect = (name: string) => {
    setSelectedArchive(name);
    void loadFileContents(name);
  };

  const toggleExpand = (idx: number) => {
    setExpanded(prev => {
      const copy = new Set(prev);
      if (copy.has(idx)) copy.delete(idx);
      else copy.add(idx);
      return copy;
    });
  };

  const totalCountForHeader =
    source === 'buffer'
      ? bufferEntries.length
      : fileTotalCount > FILE_ENTRY_LIMIT
        ? FILE_ENTRY_LIMIT
        : fileTotalCount;

  const showTruncationNote = source !== 'buffer' && fileTotalCount > FILE_ENTRY_LIMIT;

  const hasAnyEntries = activeEntries.length > 0;
  const hasFilteredEntries = filteredEntries.length > 0;

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
            onClick={() => handleSourceChange('buffer')}
            label={t('logs.source.buffer')}
          />
          <SourceButton
            active={source === 'today'}
            onClick={() => handleSourceChange('today')}
            label={t('logs.source.today')}
          />
          <SourceButton
            active={source === 'archive'}
            onClick={() => handleSourceChange('archive')}
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
              value={selectedArchive ?? undefined}
              onValueChange={handleArchiveSelect}
              disabled={fileList.length === 0}
            >
              <SelectTrigger className="h-8 text-[12px] max-w-md">
                <SelectValue
                  placeholder={
                    fileList.length === 0
                      ? t('logs.filePicker.noFiles')
                      : t('logs.filePicker.placeholder')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {fileList.map(file => (
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
          <Select value={levelFilter} onValueChange={v => setLevelFilter(v as LevelFilter)}>
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
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('logs.searchPlaceholder')}
            className="h-8 max-w-xs"
            aria-label={t('logs.searchAria')}
          />

          {/* Runtime log level */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11.5px] text-muted-foreground">{t('logs.levelLabel')}</span>
            <Select value={runtimeLevel} onValueChange={handleRuntimeLevelChange}>
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
            {levelChangedAt !== null && (
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
            onClick={handleTogglePause}
            disabled={source !== 'buffer'}
            aria-label={paused ? t('logs.resume') : t('logs.pause')}
          >
            {paused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                {t('logs.resume')}
                {pendingCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                    {t('logs.newCount', { count: pendingCount })}
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
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={!hasFilteredEntries}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('logs.copied') : t('logs.copyAll')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!hasFilteredEntries}>
            <Download className="w-3.5 h-3.5" />
            {t('logs.export')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleClear} disabled={!hasAnyEntries}>
            <Trash2 className="w-3.5 h-3.5" />
            {t('logs.clear')}
          </Button>
        </div>

        {/* List + optional jump-to-tail button */}
        <div className="relative">
          <div
            ref={listRef}
            onScroll={handleScroll}
            className={cn(
              'max-h-[52vh] overflow-x-hidden overflow-y-auto rounded-lg border border-border-glass bg-background/40',
              'font-mono text-[11px] leading-[1.55]'
            )}
          >
            {fileLoading && source !== 'buffer' ? (
              <div className="p-6 text-center text-muted-foreground text-[12px]">
                {t('logs.loading')}
              </div>
            ) : fileError && source !== 'buffer' ? (
              <div className="p-6 text-center text-destructive text-[12px]">
                <AlertCircle className="w-4 h-4 mx-auto mb-2" />
                {fileError}
              </div>
            ) : !hasAnyEntries ? (
              <div className="p-6 text-center text-muted-foreground text-[12px]">
                <X className="w-4 h-4 mx-auto mb-2 opacity-50" />
                {source === 'buffer' ? t('logs.emptyBuffer') : t('logs.emptyFile')}
              </div>
            ) : !hasFilteredEntries ? (
              <div className="p-6 text-center text-muted-foreground text-[12px]">
                {t('logs.noFilterMatches')}
              </div>
            ) : (
              <ul className="divide-y divide-border-glass/50">
                {filteredEntries.map((entry, i) => {
                  const isOpen = expanded.has(i);
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
                              onClick={() => toggleExpand(i)}
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

          {showJumpToTail && hasFilteredEntries && (
            <button
              type="button"
              onClick={handleJumpToTail}
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

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

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

function formatLine(entry: LogEntry): string {
  const time = entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp;
  const level = entry.level.toUpperCase().padEnd(5);
  const base = `${time} ${level} [${entry.context}] ${entry.message}`;
  if (entry.data === undefined) return base;
  return `${base} ${stringifyData(entry.data)}`;
}

function stringifyData(data: unknown): string {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function prettyPrintData(data: unknown): string {
  if (typeof data === 'string') {
    // If the string is itself JSON, pretty-print it.
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function parseJsonlLogEntries(contents: string): LogEntry[] {
  const out: LogEntry[] = [];
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as Partial<LogEntry>;
      if (
        typeof parsed?.timestamp === 'string' &&
        typeof parsed?.level === 'string' &&
        typeof parsed?.context === 'string' &&
        typeof parsed?.message === 'string' &&
        isValidLevel(parsed.level)
      ) {
        out.push(parsed as LogEntry);
      }
    } catch {
      // Skip malformed lines silently.
    }
  }
  return out;
}

function isValidLevel(value: string): value is LogLevelName {
  return value === 'error' || value === 'warn' || value === 'info' || value === 'debug';
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatFileDate(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatDownloadStamp(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}${mi}`;
}

function describeError(err: unknown, t: TFunction<'settings'>): string {
  if (err instanceof Error) return err.message || t('logs.unknownError');
  if (typeof err === 'string') return err;
  return t('logs.fileError');
}
