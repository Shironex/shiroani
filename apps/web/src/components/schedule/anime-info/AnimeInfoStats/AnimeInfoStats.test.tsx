import { describe, expect, it } from 'vitest';
import type { AiringAnime } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import AnimeInfoStats from './AnimeInfoStats';

const anime = {
  id: 1,
  airingAt: 1717000000,
  episode: 1,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: {},
    episodes: 28,
    status: 'RELEASING',
    genres: [],
    averageScore: 90,
  },
} as unknown as AiringAnime;

describe('AnimeInfoStats', () => {
  it('renders the episodes badge', () => {
    render(
      <AnimeInfoStats anime={anime} details={null} topRanking={null} format="TV" episodes={12} />
    );

    expect(screen.getByText(/12/)).toBeInTheDocument();
  });
});
