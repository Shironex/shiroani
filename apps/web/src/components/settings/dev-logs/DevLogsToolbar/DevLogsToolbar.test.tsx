import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { ILogSource } from '@/components/settings/dev-logs/useLogSource';
import { DevLogsToolbar } from './index';

const noop = () => {};
const logs = {
  source: 'buffer',
  handleSourceChange: noop,
  resetSignal: 0,
  fileList: [],
  selectedArchive: null,
  fileLoading: false,
  fileError: null,
  handleArchiveSelect: noop,
  levelFilter: 'all',
  setLevelFilter: noop,
  searchInput: '',
  setSearchInput: noop,
  runtimeLevel: 'info',
  levelChangedAt: null,
  handleRuntimeLevelChange: noop,
  paused: false,
  pendingCount: 0,
  handleTogglePause: noop,
  expanded: new Set<string>(),
  toggleExpand: noop,
  copied: false,
  handleCopy: noop,
  handleExport: noop,
  handleClear: noop,
  activeEntries: [],
  filteredEntries: [],
  totalCountForHeader: 0,
  fileTotalCount: 0,
  showTruncationNote: false,
  hasAnyEntries: false,
  hasFilteredEntries: false,
} as unknown as ILogSource;

describe('DevLogsToolbar', () => {
  it('renders the export action button', () => {
    render(<DevLogsToolbar logs={logs} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});
