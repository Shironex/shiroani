import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { FeedItem, FeedSource } from '@shiroani/shared';
import { useFeedStore } from '@/stores/useFeedStore';
import { useFeedBookmarksStore } from '@/stores/useFeedBookmarksStore';
import { withFullHeight } from '../../../../.storybook/decorators';
import FeedView from './FeedView';

const sources: FeedSource[] = [
  {
    id: 1,
    name: 'Anime News Network',
    url: 'https://example.com/ann.xml',
    siteUrl: 'https://example.com',
    category: 'news',
    language: 'en',
    color: '#1d4999',
    enabled: true,
    pollIntervalMinutes: 30,
    consecutiveFailures: 0,
    supportsFullContent: false,
  },
  {
    id: 2,
    name: 'Animeholik',
    url: 'https://example.com/animeholik.xml',
    siteUrl: 'https://example.com',
    category: 'news',
    language: 'pl',
    color: '#ff6b6b',
    enabled: true,
    pollIntervalMinutes: 120,
    consecutiveFailures: 0,
    supportsFullContent: false,
  },
];

const items: FeedItem[] = [1, 2, 3, 4].map(n => ({
  id: n,
  feedSourceId: n % 2 === 0 ? 2 : 1,
  sourceName: n % 2 === 0 ? 'Animeholik' : 'Anime News Network',
  sourceColor: n % 2 === 0 ? '#ff6b6b' : '#1d4999',
  sourceCategory: 'news',
  sourceLanguage: n % 2 === 0 ? 'pl' : 'en',
  sourceSupportsFullContent: false,
  guid: `guid-${n}`,
  title: `Story number ${n} about the upcoming season`,
  description: `Summary for story ${n}.`,
  url: `https://example.com/${n}`,
  author: 'Editorial Desk',
  publishedAt: '2026-06-14T08:00:00.000Z',
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
}));

/**
 * The contentful base store snapshot. Seeding non-empty `items` plus settled
 * loading flags is what keeps the view socket-free: `useFeedView`'s bootstrap
 * effect only emits `GET_ITEMS` (which auto-connects the socket and then
 * reconnects forever against the dead test backend) while the feed is empty and
 * idle. A populated, non-loading store short-circuits that effect entirely.
 */
const CONTENT_STATE = {
  items,
  sources,
  total: items.length,
  hasMore: false,
  categoryFilter: 'all' as const,
  languageFilter: 'all' as const,
  sourceFilter: null,
  isLoading: false,
  isRefreshing: false,
  isBootstrapping: false,
  error: null,
  lastRefreshNewCount: null,
  readIds: new Set<number>(),
};

/**
 * Top-level News feed screen — header (search, view toggle, language pills,
 * mark-all-read, refresh), the hero + list column, and the sources sidebar,
 * plus the reader modal.
 *
 * Every story seeds `useFeedStore` in `beforeEach` and stubs `markAllSeen` with
 * `fn()`. Both matter for staying socket-free: a non-empty `items` array skips
 * the bootstrap fetch, and the stub replaces the real `markAllSeen` (which fires
 * a `SET_LAST_VISITED` emit on mount, auto-connecting the socket). With both in
 * place no story ever opens a connection.
 */
const meta = {
  title: 'feed/FeedView',
  component: FeedView,
  parameters: {
    layout: 'fullscreen',
    // The populated, empty, error, and bookmark states all pass axe clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    // The view's mount effects resolve `markAllSeen` and the bootstrap
    // `fetchItems` from the store at call time, so stubbing them here keeps
    // every story socket-free: the real implementations emit (SET_LAST_VISITED /
    // GET_ITEMS), which auto-connects the socket and reconnects forever against
    // the dead test backend. `markRead` is stubbed for the same reason — opening
    // the reader persists the read id over the socket.
    useFeedStore.setState({ markAllSeen: fn(), fetchItems: fn(), markRead: fn() });
    useFeedBookmarksStore.setState({ bookmarks: new Map(), loaded: true });
  },
} satisfies Meta<typeof FeedView>;

export default meta;

type Story = StoryObj<typeof FeedView>;

/** Populated feed — hero card, list rows, and the sources sidebar. */
export const Default: Story = {
  beforeEach: () => {
    useFeedStore.setState(CONTENT_STATE);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'News', level: 1 })).toBeInTheDocument();
    // The newest item becomes the hero (h2); the rest render as list rows.
    await expect(
      canvas.getByRole('heading', { name: 'Story number 1 about the upcoming season', level: 2 })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Story number 2 about the upcoming season' })
    ).toBeInTheDocument();
  },
};

/** Loading — the bootstrap animation while the first fetch is in flight. */
export const Loading: Story = {
  beforeEach: () => {
    useFeedStore.setState({
      ...CONTENT_STATE,
      items: [],
      total: 0,
      isLoading: true,
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('Loading news')).toBeInTheDocument());
  },
};

/**
 * Failed initial fetch with no cached items — shows the error message and a
 * "Try again" retry CTA instead of the empty-state copy.
 */
export const LoadError: Story = {
  beforeEach: () => {
    useFeedStore.setState({
      ...CONTENT_STATE,
      items: [],
      total: 0,
      error: 'Network unavailable',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Network unavailable')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  },
};

/**
 * Empty feed — settled with no items and no error. Shows the "No news" empty
 * state with a refresh CTA. The store is seeded with a stub `refreshFeeds` so the
 * CTA never opens a socket if exercised.
 */
export const Empty: Story = {
  beforeEach: () => {
    useFeedStore.setState({
      ...CONTENT_STATE,
      items: [],
      total: 0,
      // The empty-state refresh CTA emits — stub it so a click stays socket-free.
      refreshFeeds: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No news')).toBeInTheDocument();
  },
};

/**
 * Switching to the Bookmarks tab swaps the list for stored snapshots. With no
 * bookmarks saved, the bookmarks empty state is shown.
 */
export const BookmarksEmpty: Story = {
  beforeEach: () => {
    useFeedStore.setState(CONTENT_STATE);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Bookmarks' }));
    await waitFor(() => expect(canvas.getByText('No bookmarks')).toBeInTheDocument());
  },
};

/**
 * Opening a story in the reader — clicking a list row marks it read and opens
 * the portalled reader dialog with the article title.
 */
export const OpenReader: Story = {
  beforeEach: () => {
    useFeedStore.setState(CONTENT_STATE);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Story number 2 about the upcoming season' })
    );
    // The reader dialog portals to document.body.
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByRole('heading', {
        level: 1,
        name: 'Story number 2 about the upcoming season',
      })
    ).toBeInTheDocument();
    // Close the dialog with Escape so the underlying view is focusable (not
    // hidden behind an open modal) when axe runs after play.
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        body.queryByRole('heading', {
          level: 1,
          name: 'Story number 2 about the upcoming season',
        })
      ).not.toBeInTheDocument()
    );
  },
};
