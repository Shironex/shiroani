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

  it('renders the featured pill, teaser, and a machine-readable time', () => {
    render(<FeedHero item={item} onOpen={vi.fn()} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('The studio confirmed a two-cour run.')).toBeInTheDocument();
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2026-06-14T08:00:00.000Z');
  });

  it('omits the teaser and author when those fields are missing', () => {
    render(
      <FeedHero item={{ ...item, description: undefined, author: undefined }} onOpen={vi.fn()} />
    );
    expect(screen.queryByText('The studio confirmed a two-cour run.')).not.toBeInTheDocument();
    expect(screen.queryByText('Editorial Desk')).not.toBeInTheDocument();
    // The headline still renders.
    expect(
      screen.getByRole('heading', {
        name: 'A sweeping new anime adaptation was announced today',
      })
    ).toBeInTheDocument();
  });
});
