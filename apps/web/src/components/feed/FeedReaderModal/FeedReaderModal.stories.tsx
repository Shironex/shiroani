import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { FeedItem } from '@shiroani/shared';
import { useFeedBookmarksStore } from '@/stores/useFeedBookmarksStore';
import FeedReaderModal from './FeedReaderModal';

const item: FeedItem = {
  id: 1,
  feedSourceId: 10,
  sourceName: 'Anime News Network',
  sourceColor: '#1d4999',
  sourceCategory: 'news',
  sourceLanguage: 'en',
  // Keep extraction off: a teaser-extractable item would emit GET_ARTICLE on
  // open, which auto-connects the socket. The teaser path is the socket-free one.
  sourceSupportsFullContent: false,
  guid: 'guid-1',
  title: 'A long-awaited sequel finally has a premiere date',
  description: 'The production committee confirmed the new season this morning.',
  url: 'https://example.com/article',
  author: 'Editorial Desk',
  publishedAt: '2026-06-14T08:00:00.000Z',
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
};

const related: FeedItem = {
  ...item,
  id: 2,
  title: 'A related story worth reading next',
  url: 'https://example.com/related',
};

/**
 * In-app article reader dialog — source chip + actions top bar, hero image,
 * meta row, headline, byline, the teaser/full-article body, and a "Related"
 * panel. Renders the article title as a screen-reader-only `DialogTitle` and
 * portals its content to `document.body`.
 *
 * Bookmarks are persisted through `useFeedBookmarksStore`; each story resets it
 * in `beforeEach`. The seeded item opts out of full-content extraction so the
 * reader stays on the teaser path and never emits to fetch the article body.
 */
const meta = {
  title: 'feed/FeedReaderModal',
  component: FeedReaderModal,
  parameters: {
    // Top-bar controls carry accessible names; the dialog has an sr-only title
    // and description. The reader passes axe clean.
    a11y: { test: 'error' },
  },
  args: {
    item,
    open: true,
    onOpenChange: fn(),
    relatedItems: [item, related],
    onOpenRelated: fn(),
    onOpenExternal: fn(),
  },
  beforeEach: () => {
    useFeedBookmarksStore.setState({ bookmarks: new Map(), loaded: true });
  },
} satisfies Meta<typeof FeedReaderModal>;

export default meta;

type Story = StoryObj<typeof FeedReaderModal>;

/** Open reader — title, teaser, and related panel render in the portalled dialog. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByRole('heading', {
        level: 1,
        name: 'A long-awaited sequel finally has a premiere date',
      })
    ).toBeInTheDocument();
    await expect(
      body.getByText('The production committee confirmed the new season this morning.')
    ).toBeInTheDocument();
    await expect(body.getByText('A related story worth reading next')).toBeInTheDocument();
  },
};

/** Toggling the bookmark action writes the snapshot into the bookmarks store. */
export const ToggleBookmark: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const bookmarkButton = await body.findByRole('button', { name: 'Save for later' });
    await userEvent.click(bookmarkButton);
    await waitFor(() => expect(useFeedBookmarksStore.getState().bookmarks.has(1)).toBe(true));
    // The action relabels once the item is bookmarked.
    await expect(await body.findByRole('button', { name: 'Remove bookmark' })).toBeInTheDocument();
  },
};

/** The open-in-browser action forwards the current item to onOpenExternal. */
export const OpenExternal: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole('button', { name: 'Open in browser' }));
    await expect(args.onOpenExternal).toHaveBeenCalledWith(item);
  },
};

/** Clicking a related row forwards that item to onOpenRelated. */
export const OpenRelated: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByText('A related story worth reading next'));
    await waitFor(() => expect(args.onOpenRelated).toHaveBeenCalledWith(related));
  },
};

/** No item — the reader renders only its screen-reader shell, nothing visible. */
export const NoItem: Story = {
  args: { item: null },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      body.queryByText('A long-awaited sequel finally has a premiere date')
    ).not.toBeInTheDocument();
  },
};
