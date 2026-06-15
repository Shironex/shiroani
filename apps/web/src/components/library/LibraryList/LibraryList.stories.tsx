import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryList from './LibraryList';

const withFixedSize: Decorator = Story => (
  <div style={{ height: '90vh', width: '100%' }}>
    <Story />
  </div>
);

function makeEntry(id: number): AnimeEntry {
  return {
    id,
    title: `Anime #${id}`,
    status: 'watching',
    currentEpisode: (id % 12) + 1,
    episodes: 12,
    score: (id % 10) + 1,
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };
}

const entries = Array.from({ length: 20 }, (_, i) => makeEntry(i + 1));

const meta = {
  title: 'library/LibraryList',
  component: LibraryList,
  parameters: { layout: 'fullscreen' },
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  },
  args: { entries, nextAiringMap: new Map(), onSelect: () => {} },
  decorators: [withFixedSize],
} satisfies Meta<typeof LibraryList>;

export default meta;

type Story = StoryObj<typeof LibraryList>;

export const Default: Story = {};
