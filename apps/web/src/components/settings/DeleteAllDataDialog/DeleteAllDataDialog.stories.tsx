import type { Meta, StoryObj } from '@storybook/react-vite';
import DeleteAllDataDialog from './DeleteAllDataDialog';

const meta = {
  title: 'settings/DeleteAllDataDialog',
  component: DeleteAllDataDialog,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DeleteAllDataDialog>;

export default meta;

type Story = StoryObj<typeof DeleteAllDataDialog>;

/**
 * Open dialog at rest — the destructive button stays disabled until the
 * confirmation keyword is typed. The wipe itself is exercised in
 * DeleteAllDataDialog.test.tsx, where `@/lib/wipe-all-data` is mocked.
 */
export const Default: Story = {
  args: { open: true, onOpenChange: () => {}, onExportFirst: () => {} },
};
