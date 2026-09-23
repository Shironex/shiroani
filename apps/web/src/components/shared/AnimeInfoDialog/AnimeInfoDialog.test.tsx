import { describe, expect, it, vi } from 'vitest';
import type { AiringAnime } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import AnimeInfoDialog from './AnimeInfoDialog';

// The dialog fetches details over the socket on open — reject so the test is
// deterministic and the component falls back to the schedule-entry basic info.
vi.mock('@/lib/socketHelpers', () => ({
  emitAsync: vi.fn().mockRejectedValue(new Error('no socket')),
}));

vi.mock('@/hooks/useNotificationToggle', () => ({
  useNotificationToggle: () => ({ isSubscribed: false, toggle: vi.fn() }),
}));

vi.mock('@/hooks/useNavigateToBrowser', () => ({
  useNavigateToBrowser: () => vi.fn(),
}));

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

describe('AnimeInfoDialog', () => {
  it('renders nothing when there is no anime', () => {
    const { container } = render(
      <AnimeInfoDialog anime={null} open={false} onOpenChange={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title when open with an anime', async () => {
    render(<AnimeInfoDialog anime={anime} open onOpenChange={() => {}} />);

    // The title shows in both the sr-only DialogTitle and the visible header.
    const titles = await screen.findAllByText('Frieren');
    expect(titles.length).toBeGreaterThan(0);
  });
});
