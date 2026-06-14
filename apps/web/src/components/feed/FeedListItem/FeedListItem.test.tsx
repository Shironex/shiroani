import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
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

describe('FeedListItem', () => {
  it('renders the title and opens on click', async () => {
    const onOpen = vi.fn();
    const { user } = render(<FeedListItem item={item} onOpen={onOpen} onOpenExternal={vi.fn()} />);

    const title = screen.getByRole('button', {
      name: 'Spring season simulcasts go live this weekend',
    });
    await user.click(title);
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('fires onOpenExternal from the external-link control', async () => {
    const onOpenExternal = vi.fn();
    const { user } = render(
      <FeedListItem item={item} onOpen={vi.fn()} onOpenExternal={onOpenExternal} />
    );

    await user.click(screen.getByLabelText(/Spring season simulcasts/i));
    expect(onOpenExternal).toHaveBeenCalledWith(item);
  });
});
