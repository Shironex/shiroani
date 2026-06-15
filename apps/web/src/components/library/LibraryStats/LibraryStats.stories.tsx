import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryStats from './LibraryStats';

function makeEntry(id: number, status: AnimeEntry['status'], score: number): AnimeEntry {
  return {
    id,
    title: `Anime #${id}`,
    status,
    currentEpisode: 12,
    episodes: 12,
    score,
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };
}

const entries: AnimeEntry[] = [
  makeEntry(1, 'watching', 9),
  makeEntry(2, 'completed', 8),
  makeEntry(3, 'completed', 7),
  makeEntry(4, 'plan_to_watch', 0),
  makeEntry(5, 'on_hold', 6),
  makeEntry(6, 'dropped', 0),
];

/** Summary panel of library totals, average score, and a status-distribution bar. */
const meta = {
  title: 'library/LibraryStats',
  component: LibraryStats,
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof LibraryStats>;

export default meta;

type Story = StoryObj<typeof LibraryStats>;

export const Populated: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ entries });
  },
};

export const Empty: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ entries: [] });
  },
};
