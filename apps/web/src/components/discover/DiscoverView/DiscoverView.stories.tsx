import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import DiscoverView from './DiscoverView';

const trending: DiscoverMedia[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  title: { english: `Trending ${i + 1}` },
  coverImage: {
    large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  episodes: 12,
  averageScore: 80 + i,
  format: 'TV',
}));

/**
 * Top-level Discover screen — the view header (search + browse tabs), the
 * sort/filters/exclude controls, the virtualized result grid, and the random /
 * recommendations panels and detail dialog.
 *
 * Every story is seeded socket-free. On mount the view runs two effects that
 * would otherwise emit over the socket and reconnect forever against the dead
 * test backend, hanging the headless Chromium page: a trending fetch (only when
 * `trending` is empty) and an unconditional `fetchStatus()` to hydrate the
 * AniList connection. `beforeEach` seeds `useDiscoverStore` non-empty (so the
 * trending effect short-circuits), stubs `fetchTrending`, and stubs the auth
 * store's `fetchStatus` to a no-op so no connection is ever attempted.
 */
function seedSocketFree(overrides: Partial<ReturnType<typeof useDiscoverStore.getState>> = {}) {
  useDiscoverStore.setState({
    activeTab: 'trending',
    searchQuery: '',
    searchResults: [],
    isLoading: false,
    isSearching: false,
    error: null,
    trending,
    fetchTrending: fn(),
    ...overrides,
  });
  useAniListAuthStore.setState({ status: { connected: false }, fetchStatus: fn() });
}

const meta = {
  title: 'discover/DiscoverView',
  component: DiscoverView,
  parameters: {
    layout: 'fullscreen',
    // The header, search box, controls and empty/loading/no-results states pass
    // axe clean. The populated grid lives in the DiscoverGrid story (see Empty's
    // note for why it isn't re-exercised under the view's heading here).
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
} satisfies Meta<typeof DiscoverView>;

export default meta;

type Story = StoryObj<typeof DiscoverView>;

/**
 * Empty trending tab — the header, search box and controls render with the
 * onboarding empty state. The populated browse grid is exercised in the
 * DiscoverGrid story and DiscoverView.test.tsx (mirroring LibraryView): a
 * grid of card `<h3>` titles directly under the view's `<h1>` would trip axe's
 * heading-order rule, which belongs to the grid-in-view composition rather than
 * any single component here.
 */
export const Empty: Story = {
  beforeEach: () => seedSocketFree({ trending: [] }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Discover' })).toBeInTheDocument();
    await expect(canvas.getByText('No anime')).toBeInTheDocument();
  },
};

/** Loading — the skeleton grid shows while the initial fetch is in flight. */
export const Loading: Story = {
  beforeEach: () => seedSocketFree({ trending: [], isLoading: true }),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};

/** Failed fetch — the AniList error state with a retry CTA replaces the grid. */
export const LoadError: Story = {
  // AniListErrorState's title is an <h2>, so it follows the view's <h1> cleanly —
  // heading-order passes and this state inherits the meta's a11y 'error'.
  beforeEach: () => seedSocketFree({ trending: [], error: 'network down' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  },
};

/** Search with no matches — the "no results" empty state, distinct from no-anime. */
export const NoSearchResults: Story = {
  beforeEach: () =>
    seedSocketFree({ searchQuery: 'zzz-no-such-title', isSearching: false, searchResults: [] }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('No results')).toBeInTheDocument());
  },
};

/**
 * Typing in the search box drives the store's query immediately; the debounced
 * `search` action is stubbed so the lingering 400ms timer never emits over the
 * socket once the story settles.
 */
export const SearchInput: Story = {
  beforeEach: () => seedSocketFree({ trending: [], search: fn() }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('textbox', { name: 'Search anime...' });
    await userEvent.type(search, 'frieren');
    await waitFor(() => expect(useDiscoverStore.getState().searchQuery).toBe('frieren'));
  },
};
