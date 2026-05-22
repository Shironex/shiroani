import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { LogEntry } from '@shiroani/shared';

// ── Controllable log-buffer mock ────────────────────────────────────────
// Spread the real module (so LogLevel, DEFAULT_LANGUAGE, etc. stay intact)
// and override only the ring-buffer / level functions the hook touches.
let bufferState: LogEntry[] = [];
let bufferListener: ((next: readonly LogEntry[]) => void) | null = null;
const getLogBufferMock = vi.fn(() => bufferState.slice());
const clearLogBufferMock = vi.fn(() => {
  bufferState = [];
});
const setLogLevelMock = vi.fn();
const subscribeMock = vi.fn((listener: (next: readonly LogEntry[]) => void) => {
  bufferListener = listener;
  return () => {
    bufferListener = null;
  };
});

vi.mock('@shiroani/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@shiroani/shared')>();
  return {
    ...actual,
    getLogBuffer: () => getLogBufferMock(),
    subscribeToLogBuffer: (l: (next: readonly LogEntry[]) => void) => subscribeMock(l),
    clearLogBuffer: () => clearLogBufferMock(),
    getLogLevel: () => actual.LogLevel.INFO,
    setLogLevel: (lvl: unknown) => setLogLevelMock(lvl),
  };
});

import { useLogSource } from '../useLogSource';

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '2026-05-21T13:45:09.123Z',
    level: 'info',
    context: 'Ctx',
    message: 'msg',
    ...overrides,
  };
}

/** Simulate a push into the live ring buffer + notify the subscriber. */
function pushBuffer(e: LogEntry) {
  bufferState = [...bufferState, e];
  bufferListener?.(bufferState.slice());
}

beforeEach(() => {
  bufferState = [];
  bufferListener = null;
  vi.clearAllMocks();
});

describe('useLogSource — buffer mode', () => {
  it('starts in buffer source with the initial buffer snapshot', () => {
    bufferState = [entry({ message: 'first' })];
    const { result } = renderHook(() => useLogSource({ open: true }));
    expect(result.current.source).toBe('buffer');
    expect(result.current.activeEntries).toHaveLength(1);
    expect(result.current.hasAnyEntries).toBe(true);
  });

  it('appends live buffer pushes while not paused', () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => pushBuffer(entry({ message: 'live' })));
    expect(result.current.activeEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].message).toBe('live');
  });

  it('queues pushes as pendingCount while paused, then flushes on resume', () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.handleTogglePause());
    expect(result.current.paused).toBe(true);

    act(() => pushBuffer(entry({ message: 'while-paused-1' })));
    act(() => pushBuffer(entry({ message: 'while-paused-2' })));
    // Frozen view, but pending counter advances.
    expect(result.current.activeEntries).toHaveLength(0);
    expect(result.current.pendingCount).toBe(2);

    act(() => result.current.handleTogglePause());
    expect(result.current.paused).toBe(false);
    expect(result.current.pendingCount).toBe(0);
    // Resume pulls the latest snapshot.
    expect(result.current.activeEntries).toHaveLength(2);
  });

  it('resume bumps the reset signal (re-engage tail)', () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    const before = result.current.resetSignal;
    act(() => result.current.handleTogglePause()); // pause: no bump
    expect(result.current.resetSignal).toBe(before);
    act(() => result.current.handleTogglePause()); // resume: bump
    expect(result.current.resetSignal).toBeGreaterThan(before);
  });

  it('clear() empties the buffer and pending count', () => {
    bufferState = [entry()];
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.handleClear());
    expect(clearLogBufferMock).toHaveBeenCalledTimes(1);
    expect(result.current.pendingCount).toBe(0);
  });
});

describe('useLogSource — filter pipeline', () => {
  it('filters by level', () => {
    bufferState = [
      entry({ level: 'error', message: 'boom' }),
      entry({ level: 'info', message: 'ok' }),
    ];
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.setLevelFilter('error'));
    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0].message).toBe('boom');
  });

  it('filters by debounced text search', async () => {
    bufferState = [entry({ message: 'apple' }), entry({ message: 'banana' })];
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.setSearchInput('banana'));
    // searchInput updates immediately; the query is debounced (150ms).
    await waitFor(() => expect(result.current.filteredEntries).toHaveLength(1));
    expect(result.current.filteredEntries[0].message).toBe('banana');
  });

  it('returns the same reference (no filtering) when level=all and query empty', () => {
    bufferState = [entry(), entry()];
    const { result } = renderHook(() => useLogSource({ open: true }));
    expect(result.current.filteredEntries).toBe(result.current.activeEntries);
  });
});

describe('useLogSource — runtime level + expand', () => {
  it('applies runtime level locally and surfaces the change toast', async () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    await act(async () => {
      await result.current.handleRuntimeLevelChange('debug');
    });
    expect(result.current.runtimeLevel).toBe('debug');
    expect(setLogLevelMock).toHaveBeenCalledWith('debug');
    expect(result.current.levelChangedAt).not.toBeNull();
  });

  it('toggleExpand adds then removes an index', () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.toggleExpand(2));
    expect(result.current.expanded.has(2)).toBe(true);
    act(() => result.current.toggleExpand(2));
    expect(result.current.expanded.has(2)).toBe(false);
  });
});

describe('useLogSource — source switching', () => {
  it('switching source bumps the reset signal and resets transient state', () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    const before = result.current.resetSignal;
    act(() => result.current.toggleExpand(1));
    act(() => result.current.handleSourceChange('today'));
    expect(result.current.source).toBe('today');
    expect(result.current.resetSignal).toBeGreaterThan(before);
    expect(result.current.expanded.size).toBe(0);
  });

  it('switching to the same source is a no-op', () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    const before = result.current.resetSignal;
    act(() => result.current.handleSourceChange('buffer'));
    expect(result.current.resetSignal).toBe(before);
  });

  it('reports logsUnavailable when the electron file API is missing', async () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.handleSourceChange('today'));
    await waitFor(() => expect(result.current.fileError).toBeTruthy());
    expect(result.current.fileList).toHaveLength(0);
  });
});

describe('useLogSource — file source (electron API present)', () => {
  beforeEach(() => {
    const today = entry({ message: 'from-file' });
    (window as unknown as { electronAPI: unknown }).electronAPI = {
      app: {
        listLogFiles: vi.fn().mockResolvedValue([
          { name: 'today.jsonl', size: 100, lastModified: 2000 },
          { name: 'older.jsonl', size: 50, lastModified: 1000 },
        ]),
        readLogFile: vi.fn().mockResolvedValue(JSON.stringify(today)),
        setLogLevel: vi.fn().mockResolvedValue({ ok: true, level: 'debug' }),
      },
    };
  });

  afterEach(() => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });

  it('loads the most recent file in "today" mode', async () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.handleSourceChange('today'));
    await waitFor(() => expect(result.current.fileError).toBeNull());
    await waitFor(() => expect(result.current.activeEntries).toHaveLength(1));
    expect(result.current.activeEntries[0].message).toBe('from-file');
    expect(result.current.fileList).toHaveLength(2);
    // Sorted newest-first.
    expect(result.current.fileList[0].name).toBe('today.jsonl');
  });

  it('selecting an archive loads that file', async () => {
    const { result } = renderHook(() => useLogSource({ open: true }));
    act(() => result.current.handleSourceChange('archive'));
    await waitFor(() => expect(result.current.fileList).toHaveLength(2));
    await act(async () => {
      result.current.handleArchiveSelect('older.jsonl');
    });
    await waitFor(() => expect(result.current.selectedArchive).toBe('older.jsonl'));
    await waitFor(() => expect(result.current.activeEntries).toHaveLength(1));
  });
});
