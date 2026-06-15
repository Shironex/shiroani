import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { UpdatesSection } from './index';

function seedStore(overrides: Partial<ReturnType<typeof useUpdateStore.getState>> = {}) {
  useUpdateStore.setState({
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null,
    channel: 'stable',
    isChannelSwitching: false,
    lastCheckedAt: null,
    checkForUpdates: vi.fn(),
    startDownload: vi.fn(),
    installNow: vi.fn(),
    setChannel: vi.fn(),
    initListeners: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  });
}

afterEach(() => seedStore());

describe('UpdatesSection', () => {
  it('renders the updates card title', () => {
    seedStore();
    render(<UpdatesSection />);
    expect(screen.getByText('App version')).toBeInTheDocument();
  });

  it('reflects the idle status with the no-updates label', () => {
    seedStore({ status: 'idle' });
    render(<UpdatesSection />);
    expect(screen.getByText('No new updates')).toBeInTheDocument();
  });

  it('runs checkForUpdates when the check button is clicked', async () => {
    const checkForUpdates = vi.fn();
    seedStore({ checkForUpdates });
    const { user } = render(<UpdatesSection />);
    await user.click(screen.getByRole('button', { name: 'Check for updates' }));
    expect(checkForUpdates).toHaveBeenCalledOnce();
  });

  it('switches channel via setChannel', async () => {
    const setChannel = vi.fn();
    seedStore({ setChannel });
    const { user } = render(<UpdatesSection />);
    await user.click(screen.getByRole('button', { name: /Beta/ }));
    expect(setChannel).toHaveBeenCalledWith('beta');
  });

  it('shows the download action when an update is available', () => {
    seedStore({
      status: 'available',
      updateInfo: { version: '2.0.0', releaseNotes: null, releaseDate: '2026-01-01' },
    });
    render(<UpdatesSection />);
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });
});
