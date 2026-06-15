import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import AniListStep from './AniListStep';

beforeEach(() => {
  useAniListAuthStore.setState({ status: { connected: false }, loading: false, error: null });
});

describe('AniListStep', () => {
  it('renders the AniList title and a connect action when disconnected', () => {
    render(<AniListStep />);

    expect(screen.getByRole('heading', { level: 2, name: /AniList/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect AniList' })).toBeInTheDocument();
  });

  it('disables connect off-Electron and shows the desktop-only notice', () => {
    render(<AniListStep />);

    expect(screen.getByRole('button', { name: 'Connect AniList' })).toBeDisabled();
    expect(screen.getByText('Desktop-only feature')).toBeInTheDocument();
  });

  it('lists the AniList sync benefits', () => {
    render(<AniListStep />);

    // The connected (viewer) state can't be reached off-Electron — the mount
    // effect resets status to disconnected when no bridge is present — so the
    // benefit list is the stable, testable surface here.
    expect(screen.getByText('Import your AniList list')).toBeInTheDocument();
    expect(screen.getByText('Two-way sync keeps both sides current')).toBeInTheDocument();
  });
});
