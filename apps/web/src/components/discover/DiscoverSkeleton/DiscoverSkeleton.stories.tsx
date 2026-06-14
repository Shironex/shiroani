import type { Meta, StoryObj } from '@storybook/react-vite';
import DiscoverSkeleton from './DiscoverSkeleton';

const meta = {
  title: 'discover/DiscoverSkeleton',
  component: DiscoverSkeleton,
} satisfies Meta<typeof DiscoverSkeleton>;

export default meta;

type Story = StoryObj<typeof DiscoverSkeleton>;

export const Default: Story = {};
