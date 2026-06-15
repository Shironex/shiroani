import type { Meta, StoryObj } from '@storybook/react-vite';
import ExportDialog from './ExportDialog';

const meta = {
  title: 'shared/ExportDialog',
  component: ExportDialog,
} satisfies Meta<typeof ExportDialog>;

export default meta;

type Story = StoryObj<typeof ExportDialog>;

/**
 * Opened export dialog. The export flow emits over the socket; in Storybook the
 * request never resolves, so the dialog parks on its loading state.
 */
export const Open: Story = {
  args: { open: true, onOpenChange: () => {}, type: 'library' },
};
