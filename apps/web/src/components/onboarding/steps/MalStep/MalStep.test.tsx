import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import MalStep from './MalStep';

beforeEach(() => {
  useMalAuthStore.setState({ status: { connected: false }, loading: false, error: null });
});

describe('MalStep', () => {
  it('renders the MyAnimeList title and a connect action when disconnected', () => {
    render(<MalStep />);

    expect(screen.getByRole('heading', { level: 2, name: /MyAnimeList/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect MyAnimeList' })).toBeInTheDocument();
  });

  it('disables connect off-Electron and shows the desktop-only notice', () => {
    render(<MalStep />);

    expect(screen.getByRole('button', { name: 'Connect MyAnimeList' })).toBeDisabled();
    expect(screen.getByText('Desktop-only feature')).toBeInTheDocument();
  });

  it('lists the MyAnimeList sync benefits', () => {
    render(<MalStep />);

    // Connected state can't be reached off-Electron (the mount effect resets to
    // disconnected without a bridge), so assert the stable benefit list.
    expect(screen.getByText('Import your MyAnimeList list')).toBeInTheDocument();
    expect(screen.getByText('Two-way sync, auto-matched to AniList')).toBeInTheDocument();
  });
});
