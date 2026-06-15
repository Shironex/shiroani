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

  it('renders the description teaser and a machine-readable published time', () => {
    render(<FeedListItem item={item} onOpen={vi.fn()} onOpenExternal={vi.fn()} />);
    expect(
      screen.getByText('A packed line-up of returning favourites and fresh originals.')
    ).toBeInTheDocument();
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('dateTime', '2026-06-14T08:00:00.000Z');
  });

  it('omits the teaser when the item has no description', () => {
    render(
      <FeedListItem
        item={{ ...item, description: undefined }}
        onOpen={vi.fn()}
        onOpenExternal={vi.fn()}
      />
    );
    expect(
      screen.queryByText('A packed line-up of returning favourites and fresh originals.')
    ).not.toBeInTheDocument();
    // The headline still renders.
    expect(
      screen.getByRole('button', { name: 'Spring season simulcasts go live this weekend' })
    ).toBeInTheDocument();
  });

  it('shows a PL marker for Polish-language sources', () => {
    render(
      <FeedListItem
        item={{ ...item, sourceLanguage: 'pl' }}
        onOpen={vi.fn()}
        onOpenExternal={vi.fn()}
      />
    );
    expect(screen.getByText(/PL/)).toBeInTheDocument();
  });

  it('falls back to createdAt for the time element when publishedAt is absent', () => {
    render(
      <FeedListItem
        item={{ ...item, publishedAt: undefined, createdAt: '2026-01-02T00:00:00.000Z' }}
        onOpen={vi.fn()}
        onOpenExternal={vi.fn()}
      />
    );
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2026-01-02T00:00:00.000Z');
  });
});
