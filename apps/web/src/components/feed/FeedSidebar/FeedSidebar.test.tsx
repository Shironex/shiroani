import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
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
];

const items: FeedItem[] = [
  {
    id: 1,
    feedSourceId: 1,
    sourceName: 'Anime News Network',
    sourceColor: '#1d4999',
    sourceCategory: 'news',
    sourceLanguage: 'en',
    sourceSupportsFullContent: false,
    guid: 'guid-1',
    title: 'Story 1',
    url: 'https://example.com/1',
    categories: [],
    createdAt: '2026-06-14T08:00:00.000Z',
  },
];

describe('FeedSidebar', () => {
  it('lists enabled sources and toggles the filter on click', async () => {
    const onSetSourceFilter = vi.fn();
    const { user } = render(
      <FeedSidebar
        sources={sources}
        items={items}
        sourceFilter={null}
        onSetSourceFilter={onSetSourceFilter}
        totalCount={1}
        isBookmarksView={false}
      />
    );

    const sourceButton = screen.getByRole('button', { name: /Anime News Network/i });
    await user.click(sourceButton);
    expect(onSetSourceFilter).toHaveBeenCalledWith(1);
  });
});
