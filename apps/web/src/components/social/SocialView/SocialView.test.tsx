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
});
