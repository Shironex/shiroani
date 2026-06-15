import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import type { AniListAuthStatus, MalAuthStatus } from '@shiroani/shared';
import { AccountsSection } from '.';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { useAniListSyncStore } from '@/stores/useAniListSyncStore';
import { useMalSyncStore } from '@/stores/useMalSyncStore';

const CONNECTED: AniListAuthStatus = {
  connected: true,
  viewer: { id: 7, name: 'Anya' },
  expiresAt: 1_900_000_000_000,
};

const MAL_CONNECTED: MalAuthStatus = {
  connected: true,
  viewer: { id: 9, name: 'Loid' },
  expiresAt: 1_900_000_000_000,
};

/**
 * Both cards read `window.electronAPI`, so the bridge stub must expose both
 * `anilistAuth` and `malAuth` — passing only one would leave the other card in
 * its "desktop-only" fallback and pollute the DOM with an extra error callout.
 */
function setBridge(bridge: { anilistAuth?: unknown; malAuth?: unknown } | undefined) {
  (window as unknown as { electronAPI?: unknown }).electronAPI = bridge;
}

const noopStatus = (status: { connected: boolean }) => ({
  getStatus: vi.fn().mockResolvedValue(status),
});

/**
 * Seed the auth stores directly (bypassing the bridge) and stub their actions so
 * a click can be asserted against a spy instead of hitting IPC. The sync stores
 * are seeded idle so a connected card's inline sync card renders inert.
 */
function seedAniList(status: AniListAuthStatus, error: string | null = null) {
  const connect = vi.fn().mockResolvedValue(undefined);
  const disconnect = vi.fn().mockResolvedValue(undefined);
  useAniListAuthStore.setState({
    status,
    loading: false,
    error,
    fetchStatus: vi.fn().mockResolvedValue(undefined),
    connect,
    disconnect,
  });
  return { connect, disconnect };
}

function seedMal(status: MalAuthStatus, error: string | null = null) {
  const connect = vi.fn().mockResolvedValue(undefined);
  const disconnect = vi.fn().mockResolvedValue(undefined);
  useMalAuthStore.setState({
    status,
    loading: false,
    error,
    fetchStatus: vi.fn().mockResolvedValue(undefined),
    connect,
    disconnect,
  });
  return { connect, disconnect };
}

function seedSyncStoresIdle() {
  const idle = {
    syncing: false,
    entrySyncingId: null,
    progress: null,
    result: null,
    lastSyncedAt: null,
    error: null,
    sync: vi.fn().mockResolvedValue(undefined),
    pushLibrary: vi.fn().mockResolvedValue(undefined),
  };
  useAniListSyncStore.setState(idle);
  useMalSyncStore.setState(idle);
}

describe('AccountsSection', () => {
  beforeEach(async () => {
    useAniListAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    useMalAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    setBridge(undefined);
    vi.restoreAllMocks();
  });

  it('renders the connect button when disconnected', async () => {
    setBridge({
      anilistAuth: noopStatus({ connected: false }),
      malAuth: noopStatus({ connected: false }),
    });
    render(<AccountsSection />);
    expect(await screen.findByRole('button', { name: /connect anilist/i })).toBeInTheDocument();
  });

  it('renders the viewer name and disconnect button when connected', async () => {
    setBridge({
      anilistAuth: noopStatus(CONNECTED),
      malAuth: noopStatus({ connected: false }),
    });
    render(<AccountsSection />);
    await waitFor(() => expect(screen.getByText(/Anya/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^disconnect$/i })).toBeInTheDocument();
  });

  it('renders the MyAnimeList connect button when disconnected', async () => {
    setBridge({
      anilistAuth: noopStatus({ connected: false }),
      malAuth: noopStatus({ connected: false }),
    });
    render(<AccountsSection />);
    expect(await screen.findByRole('button', { name: /connect myanimelist/i })).toBeInTheDocument();
  });

  it('renders the MyAnimeList viewer name when connected', async () => {
    setBridge({
      anilistAuth: noopStatus({ connected: false }),
      malAuth: noopStatus(MAL_CONNECTED),
    });
    render(<AccountsSection />);
    await waitFor(() => expect(screen.getByText(/Loid/)).toBeInTheDocument());
  });

  it('drives the AniList connect action when the connect button is clicked', async () => {
    const { connect } = seedAniList({ connected: false });
    seedMal({ connected: false });
    const { user } = render(<AccountsSection />);
    await user.click(screen.getByRole('button', { name: 'Connect AniList' }));
    expect(connect).toHaveBeenCalled();
  });

  it('drives the AniList disconnect action from a connected card', async () => {
    const { disconnect } = seedAniList(CONNECTED);
    seedMal({ connected: false });
    seedSyncStoresIdle();
    const { user } = render(<AccountsSection />);
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(disconnect).toHaveBeenCalled();
  });

  it('drives the MyAnimeList connect action when the connect button is clicked', async () => {
    seedAniList({ connected: false });
    const { connect } = seedMal({ connected: false });
    const { user } = render(<AccountsSection />);
    await user.click(screen.getByRole('button', { name: 'Connect MyAnimeList' }));
    expect(connect).toHaveBeenCalled();
  });

  it('surfaces the AniList store error in the inline callout', () => {
    seedAniList({ connected: false }, 'accounts:anilist.connectError');
    seedMal({ connected: false });
    render(<AccountsSection />);
    expect(screen.getByText('Could not connect to AniList. Please try again.')).toBeInTheDocument();
  });

  it('shows the token expiry hint on a connected AniList card', () => {
    seedAniList(CONNECTED);
    seedMal({ connected: false });
    seedSyncStoresIdle();
    render(<AccountsSection />);
    expect(screen.getByText(/Token expires/)).toBeInTheDocument();
  });

  it('renders the inline sync card only when an account is connected', () => {
    seedAniList(CONNECTED);
    seedMal({ connected: false });
    seedSyncStoresIdle();
    render(<AccountsSection />);
    expect(screen.getByRole('radiogroup', { name: 'Sync direction' })).toBeInTheDocument();
  });
});
