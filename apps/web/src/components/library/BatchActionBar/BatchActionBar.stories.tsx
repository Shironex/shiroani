import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { useLibraryStore } from '@/stores/useLibraryStore';
import BatchActionBar from './BatchActionBar';

/**
 * Floating bar shown while the library is in multi-select mode. With nothing
 * picked it shows a slim hint + exit; with a selection it shows the count, a
 * status Select, a score Select, a Delete (→ confirm) action, and an exit. All
 * actions read/write `useLibraryStore`, which each story seeds in `beforeEach`.
 */
const meta = {
  title: 'library/BatchActionBar',
  component: BatchActionBar,
  parameters: {
    // The bar's controls (Select triggers carry aria-labels, buttons are named)
    // pass axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof BatchActionBar>;

export default meta;

type Story = StoryObj<typeof BatchActionBar>;

/** Slim hint bar — selection mode on, nothing picked yet. */
export const NoSelection: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Select entries to run a batch operation')).toBeInTheDocument();
    // Exiting selection mode flips the store flag.
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(useLibraryStore.getState().selectionMode).toBe(false));
  },
};

/** Full action bar — a few entries selected. */
export const WithSelection: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set([1, 2, 3]) });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('3 entries selected')).toBeInTheDocument();
    // Clicking Delete opens the portalled confirm dialog.
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText('Delete selected')).toBeInTheDocument();
    // Cancel to close the dialog so the bar is focusable (not aria-hidden behind
    // an open dialog) when the a11y check runs after play — an open dialog hides
    // the focusable bar behind aria-hidden, which axe correctly flags.
    await userEvent.click(await body.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(body.queryByText('Delete selected')).not.toBeInTheDocument());
  },
};

/** Operating the status Select picks an option from the portalled listbox. */
export const ChangeStatus: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set([1, 2]) });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    // The status SelectTrigger is labelled by its placeholder text.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Change status' }));
    // Radix Select content portals to document.body.
    const option = await body.findByRole('option', { name: /Completed/i });
    await userEvent.click(option);
    // Choosing a status runs batchUpdateStatus + clearSelection on the store.
    await waitFor(() => expect(useLibraryStore.getState().selectedIds.size).toBe(0));
  },
};
