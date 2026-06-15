import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import ProfileView from './ProfileView';

beforeEach(() => {
  useProfileStore.setState({
    username: '',
    profile: null,
    mode: null,
    isLoading: false,
    error: null,
  });
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
});

describe('ProfileView', () => {
  it('renders the header and the connect form once bootstrap resolves disconnected', async () => {
    render(<ProfileView />);
    expect(screen.getByText('My profile')).toBeInTheDocument();
    // Bootstrap awaits the (absent) auth bridge, then falls through to setup.
    expect(await screen.findByText('Connect your AniList profile')).toBeInTheDocument();
  });
});
