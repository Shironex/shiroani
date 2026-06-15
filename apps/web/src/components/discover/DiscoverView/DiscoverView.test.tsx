import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
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
    searchResults: [],
    isLoading: false,
    isSearching: false,
    error: null,
    trending,
    fetchTrending: vi.fn(),
  });
  useAniListAuthStore.setState({ status: { connected: false }, fetchStatus: vi.fn() });
  // react-window needs a non-zero container width to render its cells.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiscoverView', () => {
  it('renders the discover view header', () => {
    render(<DiscoverView />);

    expect(screen.getByRole('heading', { name: 'Discover' })).toBeInTheDocument();
  });

  it('renders the trending grid from seeded store data', () => {
    render(<DiscoverView />);

    expect(screen.getByRole('button', { name: 'Frieren' })).toBeInTheDocument();
  });

  it('shows the empty state when trending is empty', () => {
    useDiscoverStore.setState({ trending: [], fetchTrending: vi.fn() });
    render(<DiscoverView />);

    expect(screen.getByText('No anime')).toBeInTheDocument();
  });

  it('shows the no-results empty state when a finished search has no matches', () => {
    useDiscoverStore.setState({
      searchQuery: 'zzz-no-such-title',
      // isSearching gates the search-mode loading flag; false → not loading, so
      // an empty result set surfaces the no-results state rather than a skeleton.
      isSearching: false,
      isLoading: false,
      searchResults: [],
    });
    render(<DiscoverView />);

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('shows the error state with a retry action on a failed fetch', () => {
    useDiscoverStore.setState({ trending: [], error: 'network down', fetchTrending: vi.fn() });
    render(<DiscoverView />);

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('No anime')).not.toBeInTheDocument();
  });

  it('drives the store query when typing in the search box', async () => {
    const search = vi.fn();
    useDiscoverStore.setState({ search });
    const { user } = render(<DiscoverView />);

    await user.type(screen.getByRole('textbox', { name: 'Search anime...' }), 'frieren');

    expect(useDiscoverStore.getState().searchQuery).toBe('frieren');
  });
});
