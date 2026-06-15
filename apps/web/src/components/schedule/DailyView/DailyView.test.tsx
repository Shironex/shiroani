import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import DailyView from './DailyView';

// jsdom does not implement Element.scrollTo; DailyView auto-scrolls the rail to
// the live-now line on mount once entries are present.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

const DAY = '2024-01-15';
// Airing must fall on DAY for the timeline window to include the slot.
const airingAt = Math.floor(new Date(2024, 0, 15, 18, 0, 0).getTime() / 1000);

const anime = {
  id: 1,
  airingAt,
  episode: 5,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: { medium: 'x.jpg' },
    episodes: 28,
    status: 'RELEASING',
    genres: [],
    format: 'TV',
  },
} as unknown as AiringAnime;

describe('DailyView', () => {
  it('renders the empty-state title when there are no entries', () => {
    render(<DailyView entries={[]} day={DAY} />);
    expect(screen.getByText('Nothing airs that day')).toBeInTheDocument();
  });

  it('renders a slot for each entry on a non-empty day', () => {
    render(<DailyView entries={[anime]} day={DAY} />);
    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.queryByText('Nothing airs that day')).not.toBeInTheDocument();
  });

  it('invokes onAnimeClick with the entry when a slot is activated', async () => {
    const onAnimeClick = vi.fn();
    const { user } = render(<DailyView entries={[anime]} day={DAY} onAnimeClick={onAnimeClick} />);
    await user.click(screen.getByRole('button', { name: /Frieren/ }));
    expect(onAnimeClick).toHaveBeenCalledWith(anime);
  });
});
