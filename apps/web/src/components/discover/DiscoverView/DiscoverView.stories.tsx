import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import DiscoverView from './DiscoverView';

const meta = {
  title: 'discover/DiscoverView',
  component: DiscoverView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof DiscoverView>;

export default meta;

type Story = StoryObj<typeof DiscoverView>;

/**
 * Empty trending tab — the view renders its header, controls and empty state
 * without a backend. Populated browse/random/recommendation states are
 * exercised in the per-component stories and DiscoverView.test.tsx.
 */
export const Empty: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      activeTab: 'trending',
      searchQuery: '',
      isLoading: false,
      isSearching: false,
      error: null,
      trending: [],
    });
  },
};
