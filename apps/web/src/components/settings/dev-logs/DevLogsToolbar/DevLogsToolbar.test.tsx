import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { ILogSource } from '@/components/settings/dev-logs/useLogSource';
import { DevLogsToolbar } from './index';

function makeLogs(overrides: Partial<ILogSource> = {}): ILogSource {
  return {
    source: 'buffer',
    handleSourceChange: vi.fn(),
    resetSignal: 0,
    fileList: [],
    selectedArchive: null,
    fileLoading: false,
    fileError: null,
    handleArchiveSelect: vi.fn(),
    levelFilter: 'all',
    setLevelFilter: vi.fn(),
    searchInput: '',
    setSearchInput: vi.fn(),
    runtimeLevel: 'info',
    levelChangedAt: null,
    handleRuntimeLevelChange: vi.fn(),
    paused: false,
    pendingCount: 0,
    handleTogglePause: vi.fn(),
    expanded: new Set<string>(),
    toggleExpand: vi.fn(),
    copied: false,
    handleCopy: vi.fn(),
    handleExport: vi.fn(),
    handleClear: vi.fn(),
    activeEntries: [],
    filteredEntries: [],
    totalCountForHeader: 0,
    fileTotalCount: 0,
    showTruncationNote: false,
    hasAnyEntries: true,
    hasFilteredEntries: true,
    ...overrides,
  } as unknown as ILogSource;
}

describe('DevLogsToolbar', () => {
  it('renders the export action button', () => {
    render(<DevLogsToolbar logs={makeLogs()} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('switches the source when a source pill is clicked', async () => {
    const handleSourceChange = vi.fn();
    const { user } = render(<DevLogsToolbar logs={makeLogs({ handleSourceChange })} />);
    await user.click(screen.getByRole('button', { name: "Today's file" }));
    expect(handleSourceChange).toHaveBeenCalledWith('today');
  });

  it('runs setSearchInput as the search field changes', async () => {
    const setSearchInput = vi.fn();
    const { user } = render(<DevLogsToolbar logs={makeLogs({ setSearchInput })} />);
    await user.type(screen.getByRole('searchbox'), 'x');
    expect(setSearchInput).toHaveBeenCalledWith('x');
  });

  it('exports and clears via their handlers', async () => {
    const handleExport = vi.fn();
    const handleClear = vi.fn();
    const { user } = render(<DevLogsToolbar logs={makeLogs({ handleExport, handleClear })} />);
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(handleExport).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(handleClear).toHaveBeenCalledOnce();
  });

  it('disables copy and export when there are no filtered entries', () => {
    render(<DevLogsToolbar logs={makeLogs({ hasFilteredEntries: false })} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });
});
