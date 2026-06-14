import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'feed/FeedHero',
  component: FeedHero,
} satisfies Meta<typeof FeedHero>;

export default meta;

type Story = StoryObj<typeof FeedHero>;

export const Default: Story = {
  args: { item, onOpen: () => {} },
};
