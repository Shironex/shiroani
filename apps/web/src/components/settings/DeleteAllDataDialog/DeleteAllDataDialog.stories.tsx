import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import DeleteAllDataDialog from './DeleteAllDataDialog';

/**
 * Type-to-confirm dialog for the irreversible "delete all data" factory reset.
 *
 * The destructive button stays disabled until the user types the confirmation
 * keyword (DELETE in English). On confirm it runs `wipeAllData`, which relaunches
 * the app — so the confirm path is exercised in the unit test (where the module
 * is mocked), not here. These stories cover the gating and the "export first"
 * escape hatch. The dialog is the story root, so it stays open with no
 * aria-hidden siblings.
 */
const meta = {
  title: 'settings/DeleteAllDataDialog',
  component: DeleteAllDataDialog,
  parameters: {
    // Portals to document.body — render its Docs preview in an iframe so the overlay + scroll-lock stay inside the preview block.
    docs: { story: { inline: false, iframeHeight: 460 } },
    layout: 'centered',
    // The dialog title, labelled input, and named footer buttons pass axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    open: { control: 'boolean', description: 'Whether the dialog is mounted/open.' },
    onOpenChange: { description: 'Fires when the dialog requests close (Cancel / Esc / outside).' },
    onExportFirst: { description: 'Close this dialog and open the export-all flow first.' },
  },
  args: { open: true, onOpenChange: fn(), onExportFirst: fn() },
} satisfies Meta<typeof DeleteAllDataDialog>;

export default meta;

type Story = StoryObj<typeof DeleteAllDataDialog>;

/** Open at rest — the destructive button is disabled until the keyword is typed. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByText('Delete all data?')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Delete everything' })).toBeDisabled();
  },
};

/** Typing the confirmation keyword enables the destructive button. */
export const KeywordTyped: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const input = body.getByPlaceholderText('DELETE');
    await userEvent.type(input, 'DELETE');
    await expect(body.getByRole('button', { name: 'Delete everything' })).toBeEnabled();
  },
};

/** The "export first" escape hatch hands control back to the export flow. */
export const ExportFirst: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole('button', { name: /Export a backup first/ }));
    await expect(args.onExportFirst).toHaveBeenCalled();
  },
};

/** Cancel requests a close via onOpenChange without wiping anything. */
export const Cancel: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole('button', { name: 'Cancel' }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};
