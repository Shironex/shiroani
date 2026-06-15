import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
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

const noMediaId = {
  ...anime,
  media: { ...anime.media, id: 0 },
} as unknown as AiringAnime;

beforeEach(() => {
  useNotificationStore.setState({
    subscribedIds: new Set<number>(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  });
});

describe('SubscribeBellButton', () => {
  it('renders a subscribe button for an airing anime', () => {
    render(<SubscribeBellButton anime={anime} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders nothing when the anime has no media id', () => {
    const { container } = render(<SubscribeBellButton anime={noMediaId} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('calls subscribe with the entry when not yet subscribed', async () => {
    const { user } = render(<SubscribeBellButton anime={anime} />);
    await user.click(screen.getByRole('button'));
    expect(useNotificationStore.getState().subscribe).toHaveBeenCalledWith(anime);
    expect(useNotificationStore.getState().unsubscribe).not.toHaveBeenCalled();
  });

  it('calls unsubscribe with the media id when already subscribed', async () => {
    useNotificationStore.setState({ subscribedIds: new Set<number>([1]) });
    const { user } = render(<SubscribeBellButton anime={anime} />);
    await user.click(screen.getByRole('button'));
    expect(useNotificationStore.getState().unsubscribe).toHaveBeenCalledWith(1);
    expect(useNotificationStore.getState().subscribe).not.toHaveBeenCalled();
  });
});
