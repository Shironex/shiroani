import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'feed/FeedListItem',
  component: FeedListItem,
} satisfies Meta<typeof FeedListItem>;

export default meta;

type Story = StoryObj<typeof FeedListItem>;

export const Default: Story = {
  args: { item, onOpen: () => {}, onOpenExternal: () => {} },
};

export const Unread: Story = {
  args: { item, unread: true, onOpen: () => {}, onOpenExternal: () => {} },
};
