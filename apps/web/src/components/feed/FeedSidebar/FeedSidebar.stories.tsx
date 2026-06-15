import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { FeedItem, FeedSource } from '@shiroani/shared';
import FeedSidebar from './FeedSidebar';

const sources: FeedSource[] = [
  {
    id: 1,
    name: 'Anime News Network',
    url: 'https://example.com/ann.xml',
    siteUrl: 'https://example.com',
    category: 'news',
    language: 'en',
    color: '#1d4999',
    enabled: true,
    pollIntervalMinutes: 30,
    consecutiveFailures: 0,
    supportsFullContent: false,
  },
  {
    id: 2,
    name: 'Animeholik',
    url: 'https://example.com/animeholik.xml',
    siteUrl: 'https://example.com',
    category: 'news',
    language: 'pl',
    color: '#ff6b6b',
    enabled: true,
    pollIntervalMinutes: 120,
    consecutiveFailures: 0,
    supportsFullContent: true,
  },
];

const items: FeedItem[] = [1, 2, 3].map(n => ({
  id: n,
  feedSourceId: n === 3 ? 2 : 1,
  sourceName: n === 3 ? 'Animeholik' : 'Anime News Network',
  sourceColor: n === 3 ? '#ff6b6b' : '#1d4999',
  sourceCategory: 'news',
  sourceLanguage: n === 3 ? 'pl' : 'en',
  sourceSupportsFullContent: false,
  guid: `guid-${n}`,
  title: `Story ${n}`,
  url: `https://example.com/${n}`,
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
}));

/**
 * Right-hand rail for the news feed: a "My sources" card (the "All" row plus a
 * row per enabled source, each a toggle for the active source filter) and a
 * "Most active" card derived from source frequency in the loaded items. The
 * cards become inert (dimmed, non-focusable) in bookmarks view.
 */
const meta = {
  title: 'feed/FeedSidebar',
  component: FeedSidebar,
  args: {
    sources,
    items,
    sourceFilter: null,
    onSetSourceFilter: fn(),
    totalCount: 3,
    isBookmarksView: false,
  },
  argTypes: {
    sources: { description: 'Enabled feed sources rendered as filter rows.' },
    items: { description: 'Currently loaded items, used for per-source live counts.' },
    sourceFilter: { description: 'The active source id, or null for "All".' },
    onSetSourceFilter: { description: 'Called with a source id (or null) to set the filter.' },
    totalCount: { description: 'Total item count shown against the "All" row.' },
    isBookmarksView: {
      control: 'boolean',
      description: 'Dims and inerts the cards when the parent is in bookmarks view.',
    },
  },
  parameters: {
    // Source rows are named buttons with aria-pressed; the activity bars carry
    // aria-labels. Clean in both the active and inert states.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof FeedSidebar>;

export default meta;

type Story = StoryObj<typeof FeedSidebar>;

/** Default rail — clicking a source row sets it as the active filter. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Anime News Network/i }));
    await waitFor(() => expect(args.onSetSourceFilter).toHaveBeenCalledWith(1));
  },
};

/** A source already filtered — clicking it again clears the filter (toggles to null). */
export const SourceSelected: Story = {
  args: { sourceFilter: 1 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole('button', { name: /Anime News Network/i });
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(row);
    await waitFor(() => expect(args.onSetSourceFilter).toHaveBeenCalledWith(null));
  },
};

/** Bookmarks view — the cards dim and become inert (unreachable by tab/AT). */
export const BookmarksView: Story = {
  args: { isBookmarksView: true },
};
