import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { BrowserHistoryEntry } from '@shiroani/shared';
import { useBrowserStore } from '@/stores/useBrowserStore';
import BrowserHistoryDialog from './BrowserHistoryDialog';

function entry(id: string, title: string, url: string): BrowserHistoryEntry {
  return { id, title, url, visitedAt: Date.now() };
}

const history: BrowserHistoryEntry[] = [
  entry('h1', 'Shinden', 'https://shinden.pl'),
  entry('h2', 'YouTube', 'https://youtube.com'),
];

/**
 * Browsing-history dialog: a searchable chronological list of visits with a
 * labelled search input, per-row open + remove (named "Remove entry"), and a
 * "Clear all" action that is disabled when history is empty. Reads/writes the
 * history slice of `useBrowserStore`, which each story seeds. The Radix dialog
 * portals to `document.body`, so assertions query the canvas body.
 */
const meta = {
  title: 'browser/BrowserHistoryDialog',
  component: BrowserHistoryDialog,
  parameters: {
    // The dialog is titled/described, the search input labelled, and every
    // row/clear button named, so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    open: { control: 'boolean', description: 'Whether the dialog is shown.' },
    onOpenChange: { description: 'Open-state setter wired to the dialog.' },
    onNavigate: { description: 'Navigate the active pane to a chosen history entry.' },
  },
  args: {
    open: true,
    onOpenChange: fn(),
    onNavigate: fn(),
  },
} satisfies Meta<typeof BrowserHistoryDialog>;

export default meta;

type Story = StoryObj<typeof BrowserHistoryDialog>;

/** Populated history — opening a row navigates and closes the dialog. */
export const WithHistory: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ history });
  },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('dialog')).toBeInTheDocument();
    await expect(body.getByText('Shinden')).toBeInTheDocument();

    await userEvent.click(body.getByText('Shinden'));
    await expect(args.onNavigate).toHaveBeenCalledWith('https://shinden.pl');
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};

/** Searching narrows the list to matching rows. */
export const Search: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ history });
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole('dialog');
    await userEvent.type(body.getByLabelText('Search history'), 'youtube');
    await expect(body.queryByText('Shinden')).not.toBeInTheDocument();
    await expect(body.getByText('YouTube')).toBeInTheDocument();
  },
};

/** Empty history — the empty-state hint with Clear all disabled. */
export const Empty: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ history: [] });
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole('dialog');
    await expect(body.getByText('No history yet')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Clear all' })).toBeDisabled();
  },
};
