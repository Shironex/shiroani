import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import AiringEntry from './AiringEntry';

const anime = {
  id: 1,
  airingAt: 1717003600,
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

describe('AiringEntry', () => {
  it('renders the anime title for an airing slot', () => {
    render(<AiringEntry anime={anime} status="soon" now={1717000000} />);
    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });
});
