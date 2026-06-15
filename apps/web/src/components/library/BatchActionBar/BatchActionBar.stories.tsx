import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLibraryStore } from '@/stores/useLibraryStore';
import BatchActionBar from './BatchActionBar';

const meta = {
  title: 'library/BatchActionBar',
  component: BatchActionBar,
} satisfies Meta<typeof BatchActionBar>;

export default meta;

type Story = StoryObj<typeof BatchActionBar>;

/** Slim hint bar — selection mode on, nothing picked yet. */
export const NoSelection: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
  },
};

/** Full action bar — a few entries selected. */
export const WithSelection: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set([1, 2, 3]) });
  },
};
