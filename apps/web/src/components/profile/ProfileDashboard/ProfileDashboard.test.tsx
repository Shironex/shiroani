import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { mockUserProfile } from '../profile-fixtures';
import ProfileDashboard from './ProfileDashboard';

beforeEach(() => {
  // Disconnected so the viewer-scoped child surfaces (activity / social) don't
  // touch the socket — they render their not-connected branches instead.
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
});

describe('ProfileDashboard', () => {
  it('renders the sidebar, stat grid and breakdown sections', () => {
    render(
      <ProfileDashboard
        profile={mockUserProfile}
        onShare={() => {}}
        onRefresh={() => {}}
        onDisconnect={() => {}}
      />
    );
    expect(screen.getByText('Yor')).toBeInTheDocument(); // sidebar handle
    expect(screen.getByText('Favorite genres')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('MAPPA')).toBeInTheDocument(); // studio breakdown
  });
});
