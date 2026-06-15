import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import ExportDialog from './ExportDialog';

/**
 * Export dialog (Radix `Dialog`, portalled to `document.body`). On open it
 * auto-emits the export over the socket and walks a small state machine —
 * loading → success (with a "Save as…" button) → saving → saved, or error.
 * In Storybook the socket request never resolves, so the dialog parks on its
 * loading state; the saved/error branches are covered by the unit suite.
 */
const meta = {
  title: 'shared/ExportDialog',
  component: ExportDialog,
  parameters: {
    // Portals to document.body — render its Docs preview in an iframe so the overlay + scroll-lock stay inside the preview block.
    docs: { story: { inline: false, iframeHeight: 560 } },
    a11y: { test: 'error' },
  },
  argTypes: {
    open: { description: 'Whether the dialog is visible.' },
    type: {
      control: 'inline-radio',
      options: ['library', 'diary', 'all'],
      description: 'Which dataset to export — drives the default filename.',
    },
    selectedIds: { description: 'Optional subset of entry ids to export instead of everything.' },
    onOpenChange: { description: 'Fired with the next open state when the dialog closes.' },
  },
} satisfies Meta<typeof ExportDialog>;

export default meta;

type Story = StoryObj<typeof ExportDialog>;

/**
 * Opened export dialog. The export flow emits over the socket; in Storybook the
 * request never resolves, so the dialog parks on its loading state.
 */
export const Open: Story = {
  args: { open: true, onOpenChange: fn(), type: 'library' },
};

/**
 * Verifies the dialog renders its title, description and loading affordance in
 * the body portal while the export request is in flight.
 */
export const ShowsLoadingState: Story = {
  args: { open: true, onOpenChange: fn(), type: 'all' },
  play: async ({ canvasElement }) => {
    // Dialog content is portalled to document.body.
    const canvas = within(canvasElement.ownerDocument.body);
    await expect(await canvas.findByText('Export data')).toBeInTheDocument();
    await expect(await canvas.findByText('Preparing data...')).toBeInTheDocument();
  },
};
