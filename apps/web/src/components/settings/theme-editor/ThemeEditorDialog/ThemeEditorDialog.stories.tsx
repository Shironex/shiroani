import type { Meta, StoryObj } from '@storybook/react-vite';
import ThemeEditorDialog from './ThemeEditorDialog';

const meta = {
  title: 'settings/theme-editor/ThemeEditorDialog',
  component: ThemeEditorDialog,
} satisfies Meta<typeof ThemeEditorDialog>;

export default meta;

type Story = StoryObj<typeof ThemeEditorDialog>;

export const Default: Story = {
  args: { open: true, onOpenChange: () => {} },
};
