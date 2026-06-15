import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import ActivityFeed from './ActivityFeed';

beforeEach(() => {
  // Disconnected: the feed short-circuits before any socket call.
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
});

describe('ActivityFeed', () => {
  it('shows the connect prompt when no AniList account is connected', () => {
    render(<ActivityFeed />);
    expect(
      screen.getByText('Connect an AniList account to see your activity here.')
    ).toBeInTheDocument();
  });
});
