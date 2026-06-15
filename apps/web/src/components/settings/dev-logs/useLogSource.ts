import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLogBuffer,
  subscribeToLogBuffer,
  clearLogBuffer,
  getLogLevel,
  setLogLevel,
  type LogEntry,
} from '@shiroani/shared';
import {
  type LevelFilter,
  type ILogFileInfo,
  type LogLevelName,
  type SourceMode,
  LEVEL_TO_NAME,
  FILE_ENTRY_LIMIT,
  describeError,
  formatDownloadStamp,
  formatLine,
  matchesFilter,
  parseJsonlLogEntries,
} from './dev-logs-utils';

const SEARCH_DEBOUNCE_MS = 150;
const LEVEL_CHANGE_TOAST_MS = 2000;
const COPY_RESET_MS = 1500;

interface IUseLogSourceOptions {
  open: boolean;
}

export interface ILogSource {
  source: SourceMode;
  handleSourceChange: (next: SourceMode) => void;

  /**
   * Monotonically increasing token bumped whenever the view should re-engage
   * tail-following (open / source change / resume). Feed into `useStickyTail`.
   */
  resetSignal: number;

  // File-source state
  fileList: ILogFileInfo[];
  selectedArchive: string | null;
  fileLoading: boolean;
  fileError: string | null;
  handleArchiveSelect: (name: string) => void;

  // Filters
  levelFilter: LevelFilter;
  setLevelFilter: (value: LevelFilter) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;

  // Runtime log level
  runtimeLevel: LogLevelName;
  levelChangedAt: number | null;
  handleRuntimeLevelChange: (value: string) => void;

  // Pause / pending
  paused: boolean;
  pendingCount: number;
  handleTogglePause: () => void;

  // Expand (keyed by stable entry identity, not filtered index)
  expanded: Set<string>;
  toggleExpand: (key: string) => void;

  // Copy / actions
  copied: boolean;
  handleCopy: () => void;
  handleExport: () => void;
  handleClear: () => void;

  // Derived entries + counts
  activeEntries: readonly LogEntry[];
  filteredEntries: readonly LogEntry[];
  totalCountForHeader: number;
  fileTotalCount: number;
  showTruncationNote: boolean;
  hasAnyEntries: boolean;
  hasFilteredEntries: boolean;
}

/**
 * Owns the log data layer for the dev-logs dialog: live buffer subscription,
 * file/archive loading, the level + text filter pipeline, runtime log level,
 * pause/pending tracking, expand state, and the copy/export/clear actions.
 */
export function useLogSource({ open }: IUseLogSourceOptions): ILogSource {
  const { t } = useTranslation('settings');

  // Bumped to tell the sticky-tail layer to re-engage tail-following.
  const [resetSignal, setResetSignal] = useState(0);
  const bumpResetSignal = useCallback(() => setResetSignal(n => n + 1), []);

  // Source / data state
  const [source, setSource] = useState<SourceMode>('buffer');
  const [bufferEntries, setBufferEntries] = useState<readonly LogEntry[]>(() => getLogBuffer());
  const [fileEntries, setFileEntries] = useState<readonly LogEntry[]>([]);
  const [fileTotalCount, setFileTotalCount] = useState(0);
  const [fileList, setFileList] = useState<ILogFileInfo[]>([]);
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

  // Pause / pending
  const [paused, setPaused] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Copy / expand
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

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
    bumpResetSignal();
  }, [open, bumpResetSignal]);

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

  // ── Active entries (pre-filter) ─────────────────────────────────────
  const activeEntries = source === 'buffer' ? bufferEntries : fileEntries;

  // ── Filter pipeline ─────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (levelFilter === 'all' && q.length === 0) return activeEntries;
    return activeEntries.filter(entry => matchesFilter(entry, levelFilter, q));
  }, [activeEntries, levelFilter, searchQuery]);

  // ── Level change toast auto-dismiss ─────────────────────────────────
  useEffect(() => {
    if (levelChangedAt === null) return;
    const handle = window.setTimeout(() => setLevelChangedAt(null), LEVEL_CHANGE_TOAST_MS);
    return () => window.clearTimeout(handle);
  }, [levelChangedAt]);

  const formattedForCopy = useMemo(
    () => filteredEntries.map(formatLine).join('\n'),
    [filteredEntries]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedForCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      await window.electronAPI?.app?.clipboardWrite?.(formattedForCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    }
  }, [formattedForCopy]);

  const handleExport = useCallback(() => {
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
  }, [filteredEntries]);

  const handleClear = useCallback(() => {
    if (source === 'buffer') {
      clearLogBuffer();
      setPendingCount(0);
    } else {
      // For file mode, "clear" just empties the currently loaded view.
      setFileEntries([]);
      setFileTotalCount(0);
    }
    setExpanded(new Set());
  }, [source]);

  const handleTogglePause = useCallback(() => {
    if (pausedRef.current) {
      // Resume: pull the latest buffer snapshot so queued entries appear.
      if (source === 'buffer') {
        setBufferEntries(getLogBuffer());
      }
      setPendingCount(0);
      setPaused(false);
      bumpResetSignal();
    } else {
      setPaused(true);
    }
  }, [source, bumpResetSignal]);

  const handleRuntimeLevelChange = useCallback(async (value: string) => {
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
  }, []);

  const handleSourceChange = useCallback(
    (next: SourceMode) => {
      if (next === source) return;
      setSource(next);
      // Reset transient per-source state.
      setPendingCount(0);
      setPaused(false);
      setExpanded(new Set());
      setFileError(null);
      bumpResetSignal();
      if (next === 'buffer') {
        setBufferEntries(getLogBuffer());
      }
    },
    [source, bumpResetSignal]
  );

  const handleArchiveSelect = useCallback(
    (name: string) => {
      setSelectedArchive(name);
      void loadFileContents(name);
    },
    [loadFileContents]
  );

  const toggleExpand = useCallback((key: string) => {
    setExpanded(prev => {
      const copy = new Set(prev);
      if (copy.has(key)) copy.delete(key);
      else copy.add(key);
      return copy;
    });
  }, []);

  const totalCountForHeader =
    source === 'buffer'
      ? bufferEntries.length
      : fileTotalCount > FILE_ENTRY_LIMIT
        ? FILE_ENTRY_LIMIT
        : fileTotalCount;

  const showTruncationNote = source !== 'buffer' && fileTotalCount > FILE_ENTRY_LIMIT;
  const hasAnyEntries = activeEntries.length > 0;
  const hasFilteredEntries = filteredEntries.length > 0;

  return {
    source,
    handleSourceChange,
    resetSignal,
    fileList,
    selectedArchive,
    fileLoading,
    fileError,
    handleArchiveSelect,
    levelFilter,
    setLevelFilter,
    searchInput,
    setSearchInput,
    runtimeLevel,
    levelChangedAt,
    handleRuntimeLevelChange,
    paused,
    pendingCount,
    handleTogglePause,
    expanded,
    toggleExpand,
    copied,
    handleCopy,
    handleExport,
    handleClear,
    activeEntries,
    filteredEntries,
    totalCountForHeader,
    fileTotalCount,
    showTruncationNote,
    hasAnyEntries,
    hasFilteredEntries,
  };
}
