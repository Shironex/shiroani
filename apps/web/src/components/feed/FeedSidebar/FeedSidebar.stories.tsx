import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'feed/FeedSidebar',
  component: FeedSidebar,
} satisfies Meta<typeof FeedSidebar>;

export default meta;

type Story = StoryObj<typeof FeedSidebar>;

export const Default: Story = {
  args: {
    sources,
    items,
    sourceFilter: null,
    onSetSourceFilter: () => {},
    totalCount: 3,
    isBookmarksView: false,
  },
};
