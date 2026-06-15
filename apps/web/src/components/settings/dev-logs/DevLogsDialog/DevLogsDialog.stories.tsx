import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { clearLogBuffer, createLogger } from '@shiroani/shared';
import DevLogsDialog from './DevLogsDialog';

/**
 * The dev-logs viewer dialog: a header summary, the filter/action toolbar, and
 * a scrollable, tail-following list of log rows. Reads the in-memory log ring
 * buffer from `@shiroani/shared` (not a socket), so stories seed it by emitting
 * a few lines through a logger. The dialog is the story root, so it stays open
 * with no aria-hidden siblings; its `DialogTitle` provides the accessible name.
 */
function seedBuffer() {
  clearLogBuffer();
  const log = createLogger('Demo');
  log.info('App started');
  log.warn('Cache miss, refetching');
  log.error('Failed to reach AniList');
}

const meta = {
  title: 'settings/dev-logs/DevLogsDialog',
  component: DevLogsDialog,
  argTypes: {
    open: { control: 'boolean', description: 'Whether the dialog is mounted/open.' },
    onOpenChange: { description: 'Fires when the dialog requests close (Esc / outside click).' },
  },
  args: { open: true, onOpenChange: fn() },
  parameters: {
    // Portals to document.body — render its Docs preview in an iframe so the overlay + scroll-lock stay inside the preview block.
    docs: { story: { inline: false, iframeHeight: 620 } },
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DevLogsDialog>;

export default meta;

type Story = StoryObj<typeof DevLogsDialog>;

/** Open with seeded log lines — the toolbar and rows render. */
export const WithEntries: Story = {
  beforeEach: () => {
    seedBuffer();
    return () => clearLogBuffer();
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole('dialog', { name: 'Log viewer' })).toBeInTheDocument();
    await expect(body.getByText('App started')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  },
};

/** Typing in the search field narrows the visible rows. */
export const SearchFilters: Story = {
  beforeEach: () => {
    seedBuffer();
    return () => clearLogBuffer();
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const search = body.getByRole('searchbox');
    await userEvent.type(search, 'AniList');
    // The free-text filter is debounced (~150ms), so wait for it to settle.
    await waitFor(() => expect(body.queryByText('App started')).not.toBeInTheDocument());
    await expect(body.getByText('Failed to reach AniList')).toBeInTheDocument();
  },
};

/** The empty-buffer state. */
export const Empty: Story = {
  beforeEach: () => {
    clearLogBuffer();
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole('dialog', { name: 'Log viewer' })).toBeInTheDocument();
  },
};
