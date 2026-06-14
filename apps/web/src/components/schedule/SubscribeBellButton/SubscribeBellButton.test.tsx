import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import SubscribeBellButton from './SubscribeBellButton';

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
  },
} as unknown as AiringAnime;

describe('SubscribeBellButton', () => {
  it('renders a subscribe button for an airing anime', () => {
    render(<SubscribeBellButton anime={anime} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
