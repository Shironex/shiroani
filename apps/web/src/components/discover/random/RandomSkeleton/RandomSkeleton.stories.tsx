import type { Meta, StoryObj } from '@storybook/react-vite';
import RandomSkeleton from './RandomSkeleton';

const meta = {
  title: 'discover/random/RandomSkeleton',
  component: RandomSkeleton,
} satisfies Meta<typeof RandomSkeleton>;

export default meta;

type Story = StoryObj<typeof RandomSkeleton>;

export const Default: Story = {};
