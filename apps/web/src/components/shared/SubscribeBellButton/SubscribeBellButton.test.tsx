import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import SubscribeBellButton from './SubscribeBellButton';

// Keeps every other export real so only the notification capability is steered.
const platform = vi.hoisted(() => ({ supportsNative: true }));
vi.mock('@/lib/platform', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/platform')>();
  return {
    ...actual,
    get SUPPORTS_NATIVE_NOTIFICATIONS() {
      return platform.supportsNative;
    },
  };
});

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
  platform.supportsNative = true;
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

  it('exposes aria-pressed reflecting the subscription state', () => {
    useNotificationStore.setState({ subscribedIds: new Set<number>([1]) });
    render(<SubscribeBellButton anime={anime} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('stays fully visible when alwaysVisible is set', () => {
    render(<SubscribeBellButton anime={anime} alwaysVisible />);
    expect(screen.getByRole('button')).not.toHaveClass('opacity-0');
  });

  it('renders a labelled toggle without the tooltip wrapper when noTooltip is set', () => {
    render(<SubscribeBellButton anime={anime} noTooltip />);
    const button = screen.getByRole('button', { name: 'Enable notifications' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  // macOS cannot display native notifications until the app is code-signed, so
  // the control is withheld rather than left as a no-op.
  it('renders nothing when the platform cannot show native notifications', () => {
    platform.supportsNative = false;
    const { container } = render(<SubscribeBellButton anime={anime} />);
    expect(container).toBeEmptyDOMElement();
  });
});
