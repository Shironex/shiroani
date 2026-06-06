import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import type { AniListAuthStatus, MalAuthStatus } from '@shiroani/shared';
import { AccountsSection } from '../AccountsSection';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';

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
});
