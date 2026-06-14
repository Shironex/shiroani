import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import DiscoverView from './DiscoverView';

const trending: DiscoverMedia[] = [
  {
    id: 1,
    title: { english: 'Frieren' },
    coverImage: { large: 'cover.jpg' },
    episodes: 28,
    averageScore: 92,
  },
];

beforeEach(() => {
  // Seed trending so the mount effect's fetch-if-empty is a no-op, and stub
  // fetchStatus so the auth hydration effect doesn't touch the Electron bridge.
  useDiscoverStore.setState({
    activeTab: 'trending',
    searchQuery: '',
    isLoading: false,
    isSearching: false,
    error: null,
    trending,
    fetchTrending: vi.fn(),
  });
  useAniListAuthStore.setState({ status: { connected: false }, fetchStatus: vi.fn() });
});

describe('DiscoverView', () => {
  it('renders the discover view header', () => {
    render(<DiscoverView />);

    expect(screen.getByRole('heading', { name: 'Discover' })).toBeInTheDocument();
  });

  it('shows the empty state when trending is empty', () => {
    useDiscoverStore.setState({ trending: [], fetchTrending: vi.fn() });
    render(<DiscoverView />);

    expect(screen.getByText('No anime')).toBeInTheDocument();
  });
});
