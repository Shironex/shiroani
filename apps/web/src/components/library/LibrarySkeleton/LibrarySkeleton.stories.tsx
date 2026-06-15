import type { Meta, StoryObj } from '@storybook/react-vite';
import LibrarySkeleton from './LibrarySkeleton';

const meta = {
  title: 'library/LibrarySkeleton',
  component: LibrarySkeleton,
} satisfies Meta<typeof LibrarySkeleton>;

export default meta;

type Story = StoryObj<typeof LibrarySkeleton>;

export const Default: Story = {};
