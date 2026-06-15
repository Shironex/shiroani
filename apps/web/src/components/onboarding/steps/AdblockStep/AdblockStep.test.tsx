import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useBrowserStore } from '@/stores/useBrowserStore';
import AdblockStep from './AdblockStep';

beforeEach(() => {
  useBrowserStore.setState({ adblockEnabled: true });
});

describe('AdblockStep', () => {
  it('renders the ad-blocking title and its single toggle', () => {
    render(<AdblockStep />);

    expect(screen.getByRole('heading', { name: 'Ad blocking' })).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('reflects a disabled adblock flag on the toggle', () => {
    useBrowserStore.setState({ adblockEnabled: false });
    render(<AdblockStep />);
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('reflects an enabled adblock flag on the toggle', () => {
    useBrowserStore.setState({ adblockEnabled: true });
    render(<AdblockStep />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('lists the blocked categories in a labelled group', () => {
    render(<AdblockStep />);

    const list = screen.getByRole('list', { name: 'Blocked items' });
    // Five rows: ads, trackers, video ads, cookie walls, custom exceptions.
    expect(list.querySelectorAll('li')).toHaveLength(5);
  });

  it('disables the toggle and shows a desktop-only notice off-Electron', () => {
    // The story/test renderer has no window.electronAPI, so IS_ELECTRON is false.
    render(<AdblockStep />);

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText('Desktop-only feature')).toBeInTheDocument();
  });
});
