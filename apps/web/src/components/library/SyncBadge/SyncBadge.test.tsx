import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import SyncBadge from './SyncBadge';

const baseEntry = { anilistId: 1, anilistSyncedAt: null, malId: null, malSyncedAt: null } as const;

describe('SyncBadge', () => {
  beforeEach(() => {
    useAniListAuthStore.setState({ status: { connected: false } });
    useMalAuthStore.setState({ status: { connected: false } });
  });

  it('renders nothing when the provider is disconnected', () => {
    const { container } = render(<SyncBadge entry={baseEntry} provider="anilist" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the entry has no provider id', () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    const { container } = render(
      <SyncBadge entry={{ ...baseEntry, anilistId: undefined }} provider="anilist" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a synced cloud badge when connected and the entry has been synced', () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    render(<SyncBadge entry={{ ...baseEntry, anilistSyncedAt: Date.now() }} provider="anilist" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders a not-yet-synced badge with the notSynced accessible name', () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    // connected + has anilistId + syncedAt null → not-yet-synced state.
    render(<SyncBadge entry={{ ...baseEntry, anilistSyncedAt: null }} provider="anilist" />);
    expect(screen.getByRole('img', { name: /not yet synced with anilist/i })).toBeInTheDocument();
  });

  it('renders the MyAnimeList badge when the mal provider is connected and the entry has a malId', () => {
    useMalAuthStore.setState({ status: { connected: true } });
    render(<SyncBadge entry={{ ...baseEntry, malId: 99, malSyncedAt: null }} provider="mal" />);
    expect(
      screen.getByRole('img', { name: /not yet synced with myanimelist/i })
    ).toBeInTheDocument();
  });

  it('does not render the anilist badge when only mal is connected', () => {
    useMalAuthStore.setState({ status: { connected: true } });
    const { container } = render(
      <SyncBadge entry={{ ...baseEntry, anilistId: 1, malId: 99 }} provider="anilist" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render the mal badge when only anilist is connected', () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    const { container } = render(
      <SyncBadge entry={{ ...baseEntry, anilistId: 1, malId: 99 }} provider="mal" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
