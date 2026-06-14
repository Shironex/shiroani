import type { Meta, StoryObj } from '@storybook/react-vite';
import type { FeedItem } from '@shiroani/shared';
import FeedReaderModal from './FeedReaderModal';

const item: FeedItem = {
  id: 1,
  feedSourceId: 10,
  sourceName: 'Anime News Network',
  sourceColor: '#1d4999',
  sourceCategory: 'news',
  sourceLanguage: 'en',
  sourceSupportsFullContent: false,
  guid: 'guid-1',
  title: 'A long-awaited sequel finally has a premiere date',
  description: 'The production committee confirmed the new season this morning.',
  url: 'https://example.com/article',
  author: 'Editorial Desk',
  publishedAt: '2026-06-14T08:00:00.000Z',
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
};

const meta = {
  title: 'feed/FeedReaderModal',
  component: FeedReaderModal,
} satisfies Meta<typeof FeedReaderModal>;

export default meta;

type Story = StoryObj<typeof FeedReaderModal>;

export const Default: Story = {
  args: {
    item,
    open: true,
    onOpenChange: () => {},
    relatedItems: [item],
    onOpenRelated: () => {},
    onOpenExternal: () => {},
  },
};
