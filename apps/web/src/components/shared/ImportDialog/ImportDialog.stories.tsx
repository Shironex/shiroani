import type { Meta, StoryObj } from '@storybook/react-vite';
import ImportDialog from './ImportDialog';

const meta = {
  title: 'shared/ImportDialog',
  component: ImportDialog,
} satisfies Meta<typeof ImportDialog>;

export default meta;

type Story = StoryObj<typeof ImportDialog>;

/**
 * Opened import dialog. On mount it auto-opens the native file picker (a no-op
 * outside Electron), so in Storybook the dialog parks on its loading state.
 */
export const Open: Story = {
  args: { open: true, onOpenChange: () => {}, type: 'all' },
};
