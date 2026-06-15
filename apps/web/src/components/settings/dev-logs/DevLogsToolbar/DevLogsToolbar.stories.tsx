import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ILogSource } from '@/components/settings/dev-logs/useLogSource';
import DevLogsToolbar from './DevLogsToolbar';

// Hand-rolled minimal ILogSource so the story stays store/socket-free. Only the
// fields the toolbar reads matter; the rest are no-op stubs.
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

const meta = {
  title: 'settings/dev-logs/DevLogsToolbar',
  component: DevLogsToolbar,
} satisfies Meta<typeof DevLogsToolbar>;

export default meta;

type Story = StoryObj<typeof DevLogsToolbar>;

export const Default: Story = {
  args: { logs },
};
