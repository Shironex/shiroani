import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { FeedItem } from '@shiroani/shared';
import FeedHero from './FeedHero';

const item: FeedItem = {
  id: 1,
  feedSourceId: 10,
  sourceName: 'Anime News Network',
  sourceColor: '#1d4999',
  sourceCategory: 'news',
  sourceLanguage: 'en',
  sourceSupportsFullContent: false,
  guid: 'guid-1',
  title: 'A sweeping new anime adaptation was announced today',
  description: 'The studio confirmed a two-cour run with a returning director.',
  url: 'https://example.com/article',
  author: 'Editorial Desk',
  publishedAt: '2026-06-14T08:00:00.000Z',
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
};

/**
 * Large editorial feature card at the top of the news feed. The whole card is a
 * single button: clicking anywhere opens the story. Shows a gradient cover,
 * kanji watermark, featured/category/source pills, a serif headline, teaser, and
 * a metadata strip.
 */
const meta = {
  title: 'feed/FeedHero',
  component: FeedHero,
  args: { item, onOpen: fn() },
  argTypes: {
    item: { description: 'The featured feed item to render.' },
    onOpen: { description: 'Called with the item when the card is clicked.' },
  },
  parameters: {
    // The card exposes a single accessible button with the headline as its name.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof FeedHero>;

export default meta;

type Story = StoryObj<typeof FeedHero>;

/** Featured story with cover, teaser, and byline. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onOpen).toHaveBeenCalledWith(item);
  },
};

/** Minimal item — no teaser or author; the headline and pills still render. */
export const Minimal: Story = {
  args: {
    item: { ...item, description: undefined, author: undefined, imageUrl: undefined },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { name: 'A sweeping new anime adaptation was announced today' })
    ).toBeInTheDocument();
  },
};
