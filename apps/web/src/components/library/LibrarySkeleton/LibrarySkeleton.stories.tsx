import type { Meta, StoryObj } from '@storybook/react-vite';
import LibrarySkeleton from './LibrarySkeleton';

/** Loading placeholder shown while the library is being fetched. */
const meta = {
  title: 'library/LibrarySkeleton',
  component: LibrarySkeleton,
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof LibrarySkeleton>;

export default meta;

type Story = StoryObj<typeof LibrarySkeleton>;

/** Grid layout — poster-card placeholders (default). */
export const Grid: Story = { args: { viewMode: 'grid' } };

/** List layout — row placeholders matching LibraryListItem. */
export const List: Story = { args: { viewMode: 'list' } };
