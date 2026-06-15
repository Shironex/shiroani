import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
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

/** Virtualized list view of the library (react-window) sized to its container. */
const meta = {
  title: 'library/LibraryList',
  component: LibraryList,
  parameters: { layout: 'fullscreen', a11y: { test: 'error' } },
  argTypes: {
    entries: { description: 'Anime entries rendered as virtualized rows.' },
    nextAiringMap: {
      description: 'Map of AniList id → next-airing info, shown as a per-row countdown badge.',
    },
    onSelect: { description: 'Called with the entry when a row is activated (opens the editor).' },
  },
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  },
  args: { entries, nextAiringMap: new Map(), onSelect: fn() },
  decorators: [withFixedSize],
} satisfies Meta<typeof LibraryList>;

export default meta;

type Story = StoryObj<typeof LibraryList>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    // Each row is a role="button" named after its title (LibraryListItem).
    const rows = await c.findAllByRole('button', { name: /Anime #1/ });
    await userEvent.click(rows[0]);
    await waitFor(() => expect(args.onSelect).toHaveBeenCalled());
  },
};
