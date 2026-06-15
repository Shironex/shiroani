import type { Meta, StoryObj } from '@storybook/react-vite';
import LibrarySkeleton from './LibrarySkeleton';

/** Loading placeholder grid shown while the library is being fetched. */
const meta = {
  title: 'library/LibrarySkeleton',
  component: LibrarySkeleton,
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof LibrarySkeleton>;

export default meta;

type Story = StoryObj<typeof LibrarySkeleton>;

export const Default: Story = {};
