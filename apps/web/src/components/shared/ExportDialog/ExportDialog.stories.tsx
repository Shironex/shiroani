import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import ExportDialog from './ExportDialog';

/**
 * Export dialog (Radix `Dialog`, portalled to `document.body`). On open it
 * auto-requests the export and walks a small state machine: loading, then
 * success (with a "Save as…" button), saving and saved, or error. Storybook's
 * bridge never answers, so the dialog parks on its loading state. The other
 * branches are in the unit suite.
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
 * Opened export dialog, parked on its loading state because the request never
 * answers here.
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
