import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useBrowserStore } from '@/stores/useBrowserStore';
import AddToLibraryDialog from './AddToLibraryDialog';

/**
 * Save-the-current-page dialog: a titled Radix dialog with a cover preview +
 * URL field, an editable title, a status Select, episode counters, and Add /
 * Cancel actions (Add is disabled until the title is non-empty). On open it
 * scrapes metadata from the focused `<webview>`; with no active pane (the
 * Storybook default) it just shows the seeded title/url. The dialog and its
 * status Select both portal to `document.body`.
 */
const meta = {
  title: 'browser/AddToLibraryDialog',
  component: AddToLibraryDialog,
  parameters: {
    // The dialog is titled/described, every field is labelled, and both action
    // buttons are named, so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    open: { control: 'boolean', description: 'Whether the dialog is shown.' },
    url: { control: 'text', description: 'URL of the page being saved.' },
    title: { control: 'text', description: 'Initial title, prefilled into the editable field.' },
    onOpenChange: { description: 'Open-state setter wired to the dialog.' },
  },
  args: {
    open: true,
    onOpenChange: fn(),
    url: 'https://shinden.pl/series/frieren',
    title: 'Frieren',
  },
  beforeEach: () => {
    // No focused pane → the open effect skips the webview metadata scrape.
    useBrowserStore.setState({ activePaneId: null });
  },
} satisfies Meta<typeof AddToLibraryDialog>;

export default meta;

type Story = StoryObj<typeof AddToLibraryDialog>;

/** Prefilled from the page — title editable, Add enabled. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('dialog')).toBeInTheDocument();
    await expect(body.getByDisplayValue('Frieren')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Add' })).toBeEnabled();
  },
};

/** Picking a status from the portalled Select listbox. */
export const PickStatus: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole('dialog');
    const trigger = body.getByRole('combobox');
    await expect(trigger).toHaveTextContent('Plan to Watch');

    await userEvent.click(trigger);
    const option = await body.findByRole('option', { name: 'Watching' });
    await userEvent.click(option);
    await expect(trigger).toHaveTextContent('Watching');
  },
};

/** No title yet — Add is disabled until the user types one. */
export const EmptyTitle: Story = {
  args: { title: '' },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole('dialog');
    await expect(body.getByRole('button', { name: 'Add' })).toBeDisabled();

    await userEvent.type(body.getByLabelText('Title'), 'Bocchi the Rock');
    await expect(body.getByRole('button', { name: 'Add' })).toBeEnabled();
  },
};
