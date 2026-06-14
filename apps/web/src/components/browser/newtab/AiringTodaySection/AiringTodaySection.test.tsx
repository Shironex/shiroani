import { describe, expect, it, beforeEach } from 'vitest';
import type { AiringAnime } from '@shiroani/shared';
import { toLocalDate } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { useScheduleStore } from '@/stores/useScheduleStore';
import AiringTodaySection from './AiringTodaySection';

const entry: AiringAnime = {
  id: 1,
  airingAt: 1_717_000_000,
  episode: 12,
  media: {
    id: 100,
    title: { english: 'Frieren' },
    coverImage: { large: 'cover.jpg' },
    status: 'RELEASING',
    genres: [],
  },
};

beforeEach(() => {
  // Seed today's schedule so the section renders (it returns null when empty),
  // and stub isLoading false so the mount fetch-if-empty stays a no-op.
  useScheduleStore.setState({
    schedule: { [toLocalDate(new Date())]: [entry] },
    isLoading: false,
  });
});

describe('AiringTodaySection', () => {
  it('renders the section heading with seeded entries', () => {
    render(<AiringTodaySection maxCards={8} />);

    expect(screen.getByText('Airing today')).toBeInTheDocument();
  });
});
