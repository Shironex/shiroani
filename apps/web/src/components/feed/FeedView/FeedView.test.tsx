import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import type { FeedItem } from '@shiroani/shared';
import { getFeedViewState } from '../feed-view-state';
import { FeedList, LanguageToggle } from './FeedView.parts';

describe('getFeedViewState', () => {
  it('returns loading while the first feed bootstrap refresh is in progress', () => {
    expect(
      getFeedViewState({
        itemsCount: 0,
        isLoading: false,
        isRefreshing: true,
        isBootstrapping: true,
        error: null,
      })
    ).toBe('loading');
  });

  it('returns loading while an empty feed is still fetching', () => {
    expect(
      getFeedViewState({
        itemsCount: 0,
        isLoading: true,
        isRefreshing: false,
        isBootstrapping: false,
        error: null,
      })
    ).toBe('loading');
  });

  it('returns empty after loading settles with no feed items', () => {
    expect(
      getFeedViewState({
        itemsCount: 0,
        isLoading: false,
        isRefreshing: false,
        isBootstrapping: false,
        error: null,
      })
    ).toBe('empty');
  });

  it('returns error when an error is set and no items are cached', () => {
    expect(
      getFeedViewState({
        itemsCount: 0,
        isLoading: false,
        isRefreshing: false,
        isBootstrapping: false,
        error: 'boom',
      })
    ).toBe('error');
  });

  it('returns content over error when cached items are present', () => {
    expect(
      getFeedViewState({
        itemsCount: 5,
        isLoading: false,
        isRefreshing: false,
        isBootstrapping: false,
        error: 'stale error',
      })
    ).toBe('content');
  });

  it('keeps showing content while a background refresh runs over loaded items', () => {
    expect(
      getFeedViewState({
        itemsCount: 5,
        isLoading: false,
        isRefreshing: true,
        isBootstrapping: false,
        error: null,
      })
    ).toBe('content');
  });
});

const makeItem = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  id: 1,
  feedSourceId: 10,
  sourceName: 'Anime News Network',
  sourceColor: '#1d4999',
  sourceCategory: 'news',
  sourceLanguage: 'en',
  sourceSupportsFullContent: false,
  guid: 'guid-1',
  title: 'Story one',
  description: 'Summary one.',
  url: 'https://example.com/1',
  publishedAt: '2026-06-14T08:00:00.000Z',
  categories: [],
  createdAt: '2026-06-14T08:00:00.000Z',
  ...overrides,
});

describe('FeedList', () => {
  it('renders a row per item', () => {
    const items = [
      makeItem({ id: 1, title: 'Story one' }),
      makeItem({ id: 2, title: 'Story two' }),
    ];
    render(
      <FeedList
        items={items}
        feedView="all"
        readIds={new Set()}
        onOpen={vi.fn()}
        onOpenExternal={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Story one' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Story two' })).toBeInTheDocument();
  });

  it('renders nothing for an empty item list', () => {
    const { container } = render(
      <FeedList
        items={[]}
        feedView="all"
        readIds={new Set()}
        onOpen={vi.fn()}
        onOpenExternal={vi.fn()}
      />
    );
    expect(container.querySelectorAll('article')).toHaveLength(0);
  });

  it('forwards the clicked item to onOpen', async () => {
    const onOpen = vi.fn();
    const item = makeItem({ id: 7, title: 'Clickable story' });
    const { user } = render(
      <FeedList
        items={[item]}
        feedView="all"
        readIds={new Set()}
        onOpen={onOpen}
        onOpenExternal={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Clickable story' }));
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});

describe('LanguageToggle', () => {
  const options = [
    { value: 'all' as const, label: 'All' },
    { value: 'en' as const, label: 'English' },
    { value: 'pl' as const, label: 'Polish' },
  ];

  it('marks the active option as pressed', () => {
    render(<LanguageToggle options={options} active="en" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Polish' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onSelect with the chosen value', async () => {
    const onSelect = vi.fn();
    const { user } = render(<LanguageToggle options={options} active="all" onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: 'Polish' }));
    expect(onSelect).toHaveBeenCalledWith('pl');
  });

  it('exposes a labelled radio-style group', () => {
    render(<LanguageToggle options={options} active="all" onSelect={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Language' });
    expect(within(group).getAllByRole('button')).toHaveLength(3);
  });
});
