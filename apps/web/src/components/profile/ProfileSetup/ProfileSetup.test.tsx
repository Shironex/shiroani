import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useProfileStore } from '@/stores/useProfileStore';
import ProfileSetup from './ProfileSetup';

beforeEach(() => {
  // Stub setUsername so a submit never triggers the socket-backed fetch.
  useProfileStore.setState({ username: '', isLoading: false, error: null, setUsername: vi.fn() });
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

  it('keeps submit disabled for whitespace-only input', async () => {
    const { user } = render(<ProfileSetup />);
    await user.type(screen.getByRole('textbox'), '   ');
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it('submits the trimmed username to the store', async () => {
    const setUsername = vi.fn();
    useProfileStore.setState({ setUsername });
    const { user } = render(<ProfileSetup />);
    await user.type(screen.getByRole('textbox'), '  Yor  ');
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    expect(setUsername).toHaveBeenCalledWith('Yor');
  });

  it('shows the store error message under the form', () => {
    useProfileStore.setState({ error: 'AniList user not found' });
    render(<ProfileSetup />);
    expect(screen.getByText('AniList user not found')).toBeInTheDocument();
  });

  it('shows a spinner and disables submit while loading', () => {
    useProfileStore.setState({ isLoading: true });
    render(<ProfileSetup />);
    // The submit label is replaced by a spinner; the button is disabled.
    expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
