import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import DiscoverGrid from './DiscoverGrid';

const items: DiscoverMedia[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: { english: `Anime ${i + 1}` },
  coverImage: {
    large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  episodes: 12,
  averageScore: 80,
}));

/**
 * Virtualized poster grid (react-window) for the browse/search tabs. Renders a
 * {@link DiscoverCard} per item and requests the next page via `onLoadMore` when
 * scrolling nears the end. Each card carries an accessible name and alt text, so
 * axe runs clean. Wrapped in a fixed-height host so the virtualized scroller has
 * a bounded viewport to measure.
 */
const meta = {
  title: 'discover/DiscoverGrid',
  component: DiscoverGrid,
  parameters: { a11y: { test: 'error' } },
  args: {
    items,
    libraryIds: new Set<number>([2]),
    hasNextPage: false,
    isLoadingMore: false,
    onLoadMore: fn(),
    onCardClick: fn(),
    onAddToLibrary: fn(),
  },
  argTypes: {
    items: { description: 'The media to render as cards.' },
    libraryIds: { description: 'anilistIds in the local library — drives the in-library badge.' },
    hasNextPage: { control: 'boolean', description: 'Whether another page can be loaded.' },
    isLoadingMore: {
      control: 'boolean',
      description: 'Shows the trailing spinner row while paging.',
    },
  },
  render: args => (
    <div style={{ height: '70vh' }}>
      <DiscoverGrid {...args} />
    </div>
  ),
} satisfies Meta<typeof DiscoverGrid>;

export default meta;

type Story = StoryObj<typeof DiscoverGrid>;

/** Populated grid — activating a card opens its detail. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const firstCard = await canvas.findByRole('button', { name: 'Anime 1' });
    await userEvent.click(firstCard);
    await expect(args.onCardClick).toHaveBeenCalledWith(items[0]);
  },
};
