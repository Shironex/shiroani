import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AniListActivity } from '@shiroani/shared';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';

const socialFeed = vi.fn();
vi.mock('@/hooks/useSocialFeed', () => ({
  useSocialFeed: () => socialFeed(),
}));

import SocialView from './SocialView';

function connect(connected: boolean) {
  // Stub fetchStatus so the mount effect doesn't reset the seeded status via the
  // (absent) Electron bridge.
  useAniListAuthStore.setState({ status: { connected }, fetchStatus: vi.fn() });
}

beforeEach(() => {
  socialFeed.mockReturnValue({ activities: [], isLoading: false, error: null, refetch: vi.fn() });
  connect(true);
});

describe('SocialView', () => {
  it('shows the connect prompt when disconnected', () => {
    connect(false);
    render(<SocialView />);
    expect(screen.getByText(/Connect an AniList account/i)).toBeInTheDocument();
  });

  it('hides the refresh action when disconnected', () => {
    connect(false);
    render(<SocialView />);
    expect(
      screen.queryByRole('button', { name: 'Refresh community feed' })
    ).not.toBeInTheDocument();
  });

  it('renders activity rows when connected with data', () => {
    const activities: AniListActivity[] = [
      {
        type: 'text',
        id: 1,
        text: 'Hello feed',
        createdAt: 1_717_000_000,
        user: { id: 9, name: 'Mochi' },
      },
    ];
    socialFeed.mockReturnValue({ activities, isLoading: false, error: null, refetch: vi.fn() });
    render(<SocialView />);
    expect(screen.getByText('Hello feed')).toBeInTheDocument();
  });

  it('renders the empty state when connected with no activity', () => {
    render(<SocialView />);
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  it('shows the loading skeleton and busy region while fetching', () => {
    socialFeed.mockReturnValue({ activities: [], isLoading: true, error: null, refetch: vi.fn() });
    render(<SocialView />);

    const busy = screen.getByLabelText('Loading community feed');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    // Neither the empty CTA nor an error is shown while loading.
    expect(screen.queryByText(/No activity yet/i)).not.toBeInTheDocument();
  });

  it('disables the refresh button while loading', () => {
    socialFeed.mockReturnValue({ activities: [], isLoading: true, error: null, refetch: vi.fn() });
    render(<SocialView />);
    expect(screen.getByRole('button', { name: 'Refresh community feed' })).toBeDisabled();
  });

  it('renders the error state instead of the feed when the fetch fails', () => {
    socialFeed.mockReturnValue({
      activities: [],
      isLoading: false,
      error: 'network down',
      refetch: vi.fn(),
    });
    render(<SocialView />);

    // The error state owns the retry CTA; the empty CTA must not appear.
    expect(screen.queryByText(/No activity yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('refetches when the header refresh action is clicked', async () => {
    const refetch = vi.fn();
    socialFeed.mockReturnValue({ activities: [], isLoading: false, error: null, refetch });
    const { user } = render(<SocialView />);

    await user.click(screen.getByRole('button', { name: 'Refresh community feed' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('retries from the error state via the same refetch callback', async () => {
    const refetch = vi.fn();
    socialFeed.mockReturnValue({
      activities: [],
      isLoading: false,
      error: 'network down',
      refetch,
    });
    const { user } = render(<SocialView />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
