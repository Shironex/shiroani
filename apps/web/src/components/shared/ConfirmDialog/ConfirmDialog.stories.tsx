import type { Meta, StoryObj } from '@storybook/react-vite';
import ConfirmDialog from './ConfirmDialog';

const meta = {
  title: 'shared/ConfirmDialog',
  component: ConfirmDialog,
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    onConfirm: () => {},
    title: 'Usunąć wpis?',
    description: 'Tej operacji nie można cofnąć.',
  },
};
