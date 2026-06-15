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
});
