import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { ILogSource } from '@/components/settings/dev-logs/useLogSource';
import DevLogsToolbar from './DevLogsToolbar';

/**
 * All controls above the dev-logs list: the source selector (Buffer / Today /
 * Archive), the level + free-text filters, the runtime log-level select, and
 * the pause / copy / export / clear actions. Fully driven by its `logs`
 * (`ILogSource`) prop, so stories hand-roll a minimal store/socket-free stub.
 */
function makeLogs(overrides: Partial<ILogSource> = {}): ILogSource {
  return {
    source: 'buffer',
    handleSourceChange: fn(),
    resetSignal: 0,
    fileList: [],
    selectedArchive: null,
    fileLoading: false,
    fileError: null,
    handleArchiveSelect: fn(),
    levelFilter: 'all',
    setLevelFilter: fn(),
    searchInput: '',
    setSearchInput: fn(),
    runtimeLevel: 'info',
    levelChangedAt: null,
    handleRuntimeLevelChange: fn(),
    paused: false,
    pendingCount: 0,
    handleTogglePause: fn(),
    expanded: new Set<string>(),
    toggleExpand: fn(),
    copied: false,
    handleCopy: fn(),
    handleExport: fn(),
    handleClear: fn(),
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

const meta = {
  title: 'settings/dev-logs/DevLogsToolbar',
  component: DevLogsToolbar,
  parameters: {
    // Every select/input/icon button carries an accessible name, so axe passes.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DevLogsToolbar>;

export default meta;

type Story = StoryObj<typeof DevLogsToolbar>;

/** Default toolbar in buffer mode with entries available. */
export const Default: Story = {
  args: { logs: makeLogs() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  },
};

/** Picking a different source runs handleSourceChange. */
export const SwitchSource: Story = {
  args: { logs: makeLogs() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: "Today's file" }));
    await waitFor(() => expect(args.logs.handleSourceChange).toHaveBeenCalledWith('today'));
  },
};

/** Typing in the search field runs setSearchInput. */
export const Search: Story = {
  args: { logs: makeLogs() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('searchbox');
    await userEvent.type(search, 'a');
    await waitFor(() => expect(args.logs.setSearchInput).toHaveBeenCalledWith('a'));
  },
};

/** The level filter is a Radix select — picking an option runs setLevelFilter. */
export const FilterByLevel: Story = {
  args: { logs: makeLogs() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('combobox', { name: 'Level filter' }));
    const body = within(canvasElement.ownerDocument.body);
    const option = await body.findByRole('option', { name: 'Error' });
    await userEvent.click(option);
    await waitFor(() => expect(args.logs.setLevelFilter).toHaveBeenCalledWith('error'));
    // The listbox closes on select, so no portalled overlay survives into the
    // post-play a11y check.
    await waitFor(() => expect(body.queryByRole('option')).not.toBeInTheDocument());
  },
};

/** The export / copy / clear actions run their handlers. */
export const Actions: Story = {
  args: { logs: makeLogs() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Export' }));
    await expect(args.logs.handleExport).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(args.logs.handleClear).toHaveBeenCalledOnce();
  },
};
