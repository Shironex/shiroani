import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryView from './LibraryView';

const meta = {
  title: 'library/LibraryView',
  component: LibraryView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof LibraryView>;

export default meta;

type Story = StoryObj<typeof LibraryView>;

/**
 * Empty library — a stable, non-loading, error-free state with no entries, so
 * the view renders its header and the "library is empty" CTA without a backend.
 * Populated grid/list states are exercised in the per-component stories and
 * LibraryView.test.tsx.
 */
export const Default: Story = {
  beforeEach: () => {
    useLibraryStore.setState({
      entries: [],
      activeFilter: 'all',
      searchQuery: '',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      viewMode: 'grid',
      isLoading: false,
      error: null,
      isDetailOpen: false,
      selectedEntry: null,
      selectionMode: false,
      selectedIds: new Set(),
    });
  },
};
