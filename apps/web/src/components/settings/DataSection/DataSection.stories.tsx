import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import DataSection from './DataSection';

/**
 * Export / import / danger-zone cards for the settings data surface. The export
 * and import actions open their respective dialogs; the danger-zone action opens
 * the type-to-confirm DeleteAllDataDialog. Library and diary counts read from the
 * live stores (empty in Storybook).
 *
 * Only the danger-zone dialog is exercised in a play test — the export/import
 * dialogs prepare their payload over the socket on open, which would hang the
 * headless page against the dead test backend, so those triggers are only
 * asserted present here.
 */
const meta = {
  title: 'settings/DataSection',
  component: DataSection,
  parameters: {
    layout: 'padded',
    // Every card heading + action button is named; the danger-zone dialog's
    // input is labelled — axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DataSection>;

export default meta;

type Story = StoryObj<typeof DataSection>;

/** Default mount — all three cards with their dialogs closed. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Export data' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Import data' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Delete all data' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Export everything' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Pick a JSON file' })).toBeInTheDocument();
  },
};

/**
 * The danger-zone action opens the type-to-confirm DeleteAllDataDialog
 * (portalled to document.body). It is cancelled before the play function ends so
 * the cards are not left behind an open dialog when the post-play a11y check
 * runs.
 */
export const OpenDangerZone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete all data' }));

    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(body.getByText('Delete all data?')).toBeInTheDocument();

    // Close so the cards aren't aria-hidden behind the open dialog when axe runs.
    await userEvent.click(body.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());
  },
};
