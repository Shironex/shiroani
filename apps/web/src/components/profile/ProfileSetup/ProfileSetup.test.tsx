import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useProfileStore } from '@/stores/useProfileStore';
import ProfileSetup from './ProfileSetup';

beforeEach(() => {
  useProfileStore.setState({ username: '', isLoading: false, error: null });
});

describe('ProfileSetup', () => {
  it('renders the connect form with a disabled submit while empty', () => {
    render(<ProfileSetup />);
    expect(screen.getByText('Connect your AniList profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it('enables submit once a username is typed', async () => {
    const { user } = render(<ProfileSetup />);
    await user.type(screen.getByRole('textbox'), 'Yor');
    expect(screen.getByRole('button', { name: 'Connect' })).toBeEnabled();
  });
});
