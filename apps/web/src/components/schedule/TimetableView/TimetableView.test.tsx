import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import TimetableView from './TimetableView';

const WEEK_DAYS = [
  '2024-01-15',
  '2024-01-16',
  '2024-01-17',
  '2024-01-18',
  '2024-01-19',
  '2024-01-20',
  '2024-01-21',
];

function makeAnime(id: number, day: string, title: string): AiringAnime {
  const [y, m, d] = day.split('-').map(Number);
  return {
    id,
    airingAt: Math.floor(new Date(y, m - 1, d, 18, 0, 0).getTime() / 1000),
    episode: 3,
    media: {
      id,
      title: { romaji: title },
      coverImage: { large: 'cover.jpg' },
      episodes: 12,
      status: 'RELEASING',
      genres: [],
      format: 'TV',
    },
  } as unknown as AiringAnime;
}

const ENTRIES: Record<string, AiringAnime[]> = {
  '2024-01-15': [makeAnime(1, '2024-01-15', 'Frieren')],
};

const getEntriesForDay = (day: string) => ENTRIES[day] ?? [];

describe('TimetableView', () => {
  it('renders a day-number header for each day in the week', () => {
    render(<TimetableView weekDays={WEEK_DAYS} getEntriesForDay={() => []} schedule={{}} />);
    // getDayNumber('2024-01-15') === 15, surfaced via DayColumnHeader.
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  });

  it('renders a poster card for each entry', () => {
    render(
      <TimetableView weekDays={WEEK_DAYS} getEntriesForDay={getEntriesForDay} schedule={ENTRIES} />
    );
    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });

  it('invokes onAnimeClick with the entry when a poster is activated', async () => {
    const onAnimeClick = vi.fn();
    const { user } = render(
      <TimetableView
        weekDays={WEEK_DAYS}
        getEntriesForDay={getEntriesForDay}
        schedule={ENTRIES}
        onAnimeClick={onAnimeClick}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Frieren' }));
    expect(onAnimeClick).toHaveBeenCalledWith(ENTRIES['2024-01-15'][0]);
  });
});
