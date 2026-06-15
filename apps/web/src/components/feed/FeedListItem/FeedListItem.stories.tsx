import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { FeedItem } from '@shiroani/shared';
import FeedListItem from './FeedListItem';

const item: FeedItem = {
  id: 1,
  feedSourceId: 10,
  sourceName: 'Crunchyroll',
  sourceColor: '#f47521',
  sourceCategory: 'news',
  sourceLanguage: 'en',
  sourceSupportsFullContent: false,
  guid: 'guid-1',
  title: 'Spring season simulcasts go live this weekend',
  description: 'A packed line-up of returning favourites and fresh originals.',
  url: 'https://example.com/article',
  author: 'News Team',
  publishedAt: '2026-06-14T08:00:00.000Z',
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
};

/**
 * A single feed row: source/category pills, the clickable headline, a teaser, a
 * metadata strip (source · time · author), and a hover-revealed external-link
 * action. Unread rows carry a primary glow and a leading dot.
 */
const meta = {
  title: 'feed/FeedListItem',
  component: FeedListItem,
  args: { item, onOpen: fn(), onOpenExternal: fn() },
  argTypes: {
    item: { description: 'The feed item to render.' },
    unread: {
      control: 'boolean',
      description: 'Highlights the row and shows the unread dot when true.',
    },
    onOpen: { description: 'Called with the item when the thumbnail or title is clicked.' },
    onOpenExternal: {
      description: 'Called with the item when the external-link action is clicked.',
    },
  },
  parameters: {
    // The source pill fills with the source's brand color and picks black/white
    // text by luminance (readableTextColor), so it meets AA for any brand — axe
    // is enforced as an error.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof FeedListItem>;

export default meta;

type Story = StoryObj<typeof FeedListItem>;

/** Read row — no unread treatment. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Spring season simulcasts go live this weekend' })
    );
    await expect(args.onOpen).toHaveBeenCalledWith(item);
  },
};

/** Unread row — primary glow and leading dot. */
export const Unread: Story = {
  args: { unread: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // The external-link action forwards the item.
    await userEvent.click(canvas.getByRole('button', { name: /Open in browser/i }));
    await expect(args.onOpenExternal).toHaveBeenCalledWith(item);
  },
};

/** Minimal item — no description or author; the row still renders its headline. */
export const Minimal: Story = {
  args: {
    item: {
      ...item,
      description: undefined,
      author: undefined,
      imageUrl: undefined,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: 'Spring season simulcasts go live this weekend' })
    ).toBeInTheDocument();
  },
};
