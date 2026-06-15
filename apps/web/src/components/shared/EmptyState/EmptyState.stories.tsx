import type { Meta, StoryObj } from '@storybook/react-vite';
import { Star, Plus } from 'lucide-react';
import EmptyState from './EmptyState';

const meta = {
  title: 'shared/EmptyState',
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: { icon: Star, title: 'Nothing here yet', subtitle: 'Try adjusting your filters.' },
};

export const WithAction: Story = {
  args: {
    icon: Star,
    title: 'Nothing here yet',
    subtitle: 'Add your first entry to get started.',
    action: { label: 'Add new', onClick: () => {}, icon: Plus },
  },
};
