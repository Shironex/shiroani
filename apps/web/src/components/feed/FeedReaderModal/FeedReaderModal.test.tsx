import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
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

function renderModal(overrides: Partial<React.ComponentProps<typeof FeedReaderModal>> = {}) {
  return render(
    <FeedReaderModal
      item={item}
      open
      onOpenChange={vi.fn()}
      relatedItems={[item, related]}
      onOpenRelated={vi.fn()}
      onOpenExternal={vi.fn()}
      {...overrides}
    />
  );
}

describe('FeedReaderModal', () => {
  beforeEach(() => {
    useFeedBookmarksStore.setState({ bookmarks: new Map(), loaded: true });
  });

  it('renders the article title and teaser when open', () => {
    renderModal();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'A long-awaited sequel finally has a premiere date',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('The production committee confirmed the new season this morning.')
    ).toBeInTheDocument();
  });

  it('lists related items, excluding the current one', () => {
    renderModal();
    // The related row for the other item renders as a clickable button.
    expect(
      screen.getByRole('button', { name: /A related story worth reading next/i })
    ).toBeInTheDocument();
    // The current item is filtered out of "related" — no related row links back
    // to it (its title only appears as the headline + sr-only dialog title).
    expect(
      screen.queryByRole('button', { name: /A long-awaited sequel finally has a premiere date/i })
    ).not.toBeInTheDocument();
  });

  it('fires onOpenExternal from the open-in-browser action', async () => {
    const onOpenExternal = vi.fn();
    const { user } = renderModal({ onOpenExternal });
    await user.click(screen.getByRole('button', { name: /Open in browser/i }));
    expect(onOpenExternal).toHaveBeenCalledWith(item);
  });

  it('fires onOpenRelated when a related row is clicked', async () => {
    const onOpenRelated = vi.fn();
    const { user } = renderModal({ onOpenRelated });
    await user.click(screen.getByText('A related story worth reading next'));
    expect(onOpenRelated).toHaveBeenCalledWith(related);
  });

  it('toggles a bookmark and relabels the action', async () => {
    const { user } = renderModal();
    const saveButton = screen.getByRole('button', { name: 'Save for later' });
    await user.click(saveButton);
    expect(useFeedBookmarksStore.getState().bookmarks.has(item.id)).toBe(true);
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toBeInTheDocument();
  });

  it('reflects an already-bookmarked item as pressed', () => {
    useFeedBookmarksStore.getState().toggle(item);
    renderModal();
    const button = screen.getByRole('button', { name: 'Remove bookmark' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the full-article body when contentHtml is present', () => {
    renderModal({
      item: { ...item, contentHtml: '<p>Full article body paragraph.</p>' },
    });
    expect(screen.getByText('Full article body paragraph.')).toBeInTheDocument();
    // The CTA label switches to the "on site" variant for full-body articles.
    expect(screen.getByRole('button', { name: /Open on site/i })).toBeInTheDocument();
  });

  it('falls back to a preview-unavailable note with no description or body', () => {
    renderModal({ item: { ...item, description: undefined } });
    expect(screen.getByText(/Preview unavailable/i)).toBeInTheDocument();
  });

  it('renders only the screen-reader shell when there is no item', () => {
    renderModal({ item: null });
    expect(
      screen.queryByText('A long-awaited sequel finally has a premiere date')
    ).not.toBeInTheDocument();
  });
});
