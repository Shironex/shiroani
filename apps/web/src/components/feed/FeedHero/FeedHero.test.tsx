import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
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
  description: 'The studio confirmed a two-cour run.',
  url: 'https://example.com/article',
  author: 'Editorial Desk',
  publishedAt: '2026-06-14T08:00:00.000Z',
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
};

describe('FeedHero', () => {
  it('renders the headline and fires onOpen when clicked', async () => {
    const onOpen = vi.fn();
    const { user } = render(<FeedHero item={item} onOpen={onOpen} />);

    const heading = screen.getByRole('heading', {
      name: 'A sweeping new anime adaptation was announced today',
    });
    expect(heading).toBeInTheDocument();

    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});
