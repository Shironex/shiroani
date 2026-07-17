import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import AnimeInfoHeader from './AnimeInfoHeader';

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

beforeEach(() => {
  useNotificationStore.setState({
    subscribedIds: new Set<number>(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  });
});

describe('AnimeInfoHeader', () => {
  it('renders the title', () => {
    render(<AnimeInfoHeader anime={anime} title="Frieren" details={null} />);

    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });

  it('renders an always-visible subscribe toggle for the anime', () => {
    render(<AnimeInfoHeader anime={anime} title="Frieren" details={null} />);

    const bell = screen.getByRole('button', { name: 'Enable notifications' });
    expect(bell).toHaveAttribute('aria-pressed', 'false');
    expect(bell).not.toHaveClass('opacity-0');
  });
});
