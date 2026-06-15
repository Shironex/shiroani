import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { FeedItem, FeedSource } from '@shiroani/shared';
import FeedSidebar from './FeedSidebar';

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
    name: 'Disabled Source',
    url: 'https://example.com/disabled.xml',
    siteUrl: 'https://example.com',
    category: 'news',
    language: 'en',
    color: '#888888',
    enabled: false,
    pollIntervalMinutes: 30,
    consecutiveFailures: 0,
    supportsFullContent: false,
  },
];

const items: FeedItem[] = [
  {
    id: 1,
    feedSourceId: 1,
    sourceName: 'Anime News Network',
    sourceColor: '#1d4999',
    sourceCategory: 'news',
    sourceLanguage: 'en',
    sourceSupportsFullContent: false,
    guid: 'guid-1',
    title: 'Story 1',
    url: 'https://example.com/1',
    categories: [],
    createdAt: '2026-06-14T08:00:00.000Z',
  },
];

function renderSidebar(overrides: Partial<React.ComponentProps<typeof FeedSidebar>> = {}) {
  return render(
    <FeedSidebar
      sources={sources}
      items={items}
      sourceFilter={null}
      onSetSourceFilter={vi.fn()}
      totalCount={1}
      isBookmarksView={false}
      {...overrides}
    />
  );
}

describe('FeedSidebar', () => {
  it('lists enabled sources and toggles the filter on click', async () => {
    const onSetSourceFilter = vi.fn();
    const { user } = renderSidebar({ onSetSourceFilter });

    const sourceButton = screen.getByRole('button', { name: /Anime News Network/i });
    await user.click(sourceButton);
    expect(onSetSourceFilter).toHaveBeenCalledWith(1);
  });

  it('omits disabled sources from the list', () => {
    renderSidebar();
    expect(screen.queryByRole('button', { name: /Disabled Source/i })).not.toBeInTheDocument();
  });

  it('clears the filter when the active source is clicked again', async () => {
    const onSetSourceFilter = vi.fn();
    const { user } = renderSidebar({ sourceFilter: 1, onSetSourceFilter });

    const sourceButton = screen.getByRole('button', { name: /Anime News Network/i });
    expect(sourceButton).toHaveAttribute('aria-pressed', 'true');
    await user.click(sourceButton);
    expect(onSetSourceFilter).toHaveBeenCalledWith(null);
  });

  it('selects "All sources" with a null filter', async () => {
    const onSetSourceFilter = vi.fn();
    const { user } = renderSidebar({ sourceFilter: 1, onSetSourceFilter });

    await user.click(screen.getByRole('button', { name: /All sources/i }));
    expect(onSetSourceFilter).toHaveBeenCalledWith(null);
  });

  it('renders an activity bar for active sources in the trending card', () => {
    renderSidebar();
    // The trending card surfaces a labelled activity progress bar per active source.
    expect(
      screen.getByRole('progressbar', { name: 'Anime News Network activity' })
    ).toBeInTheDocument();
  });

  it('hides the trending card when no source has loaded items', () => {
    renderSidebar({ items: [] });
    expect(screen.queryByText('Most active')).not.toBeInTheDocument();
  });
});
