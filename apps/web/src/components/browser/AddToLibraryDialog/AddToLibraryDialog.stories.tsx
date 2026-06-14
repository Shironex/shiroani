import type { Meta, StoryObj } from '@storybook/react-vite';
import AddToLibraryDialog from './AddToLibraryDialog';

const meta = {
  title: 'browser/AddToLibraryDialog',
  component: AddToLibraryDialog,
} satisfies Meta<typeof AddToLibraryDialog>;

export default meta;

type Story = StoryObj<typeof AddToLibraryDialog>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    url: 'https://shinden.pl/series/frieren',
    title: 'Frieren',
  },
};
