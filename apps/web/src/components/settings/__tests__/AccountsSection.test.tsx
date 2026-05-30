import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import type { AniListAuthStatus } from '@shiroani/shared';
import { AccountsSection } from '../AccountsSection';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';

const CONNECTED: AniListAuthStatus = {
  connected: true,
  viewer: { id: 7, name: 'Anya' },
  expiresAt: 1_900_000_000_000,
};

function setBridge(bridge: unknown) {
  (window as unknown as { electronAPI?: unknown }).electronAPI = bridge
    ? { anilistAuth: bridge }
    : undefined;
}

describe('AccountsSection', () => {
  beforeEach(async () => {
    useAniListAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    setBridge(undefined);
    vi.restoreAllMocks();
  });

  it('renders the connect button when disconnected', async () => {
    setBridge({ getStatus: vi.fn().mockResolvedValue({ connected: false }) });
    render(<AccountsSection />);
    expect(await screen.findByRole('button', { name: /connect anilist/i })).toBeInTheDocument();
  });

  it('renders the viewer name and disconnect button when connected', async () => {
    setBridge({ getStatus: vi.fn().mockResolvedValue(CONNECTED) });
    render(<AccountsSection />);
    await waitFor(() => expect(screen.getByText(/Anya/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });
});
