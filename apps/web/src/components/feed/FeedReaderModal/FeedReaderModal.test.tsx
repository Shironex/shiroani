import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { FeedItem } from '@shiroani/shared';
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

function renderModal(overrides: Partial<React.ComponentProps<typeof FeedReaderModal>> = {}) {
  return render(
    <FeedReaderModal
      item={item}
      open
      onOpenChange={vi.fn()}
      relatedItems={[item]}
      onOpenRelated={vi.fn()}
      onOpenExternal={vi.fn()}
      {...overrides}
    />
  );
}

describe('FeedReaderModal', () => {
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

  it('fires onOpenExternal from the open-in-browser action', async () => {
    const onOpenExternal = vi.fn();
    const { user } = renderModal({ onOpenExternal });
    await user.click(screen.getByRole('button', { name: /Open in browser/i }));
    expect(onOpenExternal).toHaveBeenCalledWith(item);
  });

  it('renders only the screen-reader shell when there is no item', () => {
    renderModal({ item: null });
    expect(
      screen.queryByText('A long-awaited sequel finally has a premiere date')
    ).not.toBeInTheDocument();
  });
});
