import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import type { DiaryEntry } from '@shiroani/shared';
import { useDiaryStore } from '@/stores/useDiaryStore';
import DiaryView from './DiaryView';

/**
 * Seed the diary store with a clean slice and stub the socket-lifecycle actions
 * so the mount effect doesn't reach for an (absent) socket connection.
 */
function seedStore(overrides: Partial<ReturnType<typeof useDiaryStore.getState>> = {}) {
  useDiaryStore.setState({
    entries: [],
    activeFilter: 'all',
    searchQuery: '',
    viewMode: 'grid',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    selectedEntry: null,
    isEditorOpen: false,
    isLoading: false,
    error: null,
    initListeners: vi.fn(),
    fetchEntries: vi.fn(),
    cleanupListeners: vi.fn(),
    ...overrides,
  });
}

function createEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Mój wpis',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    ...overrides,
  };
}

beforeEach(() => {
  seedStore();
});

describe('DiaryView', () => {
  it('runs initListeners + fetchEntries once on mount', () => {
    const initListeners = vi.fn();
    const fetchEntries = vi.fn();
    seedStore({ initListeners, fetchEntries });
    render(<DiaryView />);
    expect(initListeners).toHaveBeenCalledTimes(1);
    expect(fetchEntries).toHaveBeenCalledTimes(1);
  });

  it('renders the header and onboarding CTA when there are no entries', () => {
    render(<DiaryView />);
    expect(screen.getByRole('heading', { name: 'Diary' })).toBeInTheDocument();
    expect(screen.getByText('Your diary is still empty')).toBeInTheDocument();
  });

  it('renders entry cards when the store has entries', () => {
    seedStore({ entries: [createEntry({ id: 1, title: 'Widoczny wpis' })] });
    render(<DiaryView />);
    expect(screen.getByText('Widoczny wpis')).toBeInTheDocument();
  });

  it('shows the loading skeleton (not the CTA) while the initial fetch is in flight', () => {
    seedStore({ isLoading: true });
    const { container } = render(<DiaryView />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText('Your diary is still empty')).not.toBeInTheDocument();
  });

  it('shows the retry CTA on a failed load, not the onboarding CTA', () => {
    seedStore({ error: 'boom' });
    render(<DiaryView />);
    expect(screen.getByText("Couldn't load your diary")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText('Your diary is still empty')).not.toBeInTheDocument();
  });

  it('shows the no-results hint (not the onboarding CTA) when a search matches nothing', () => {
    seedStore({
      entries: [createEntry({ id: 1, title: 'Frieren' })],
      searchQuery: 'zzz-nothing',
    });
    render(<DiaryView />);
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.queryByText('Your diary is still empty')).not.toBeInTheDocument();
  });

  it('filters to pinned entries when the pinned filter is active', () => {
    seedStore({
      entries: [
        createEntry({ id: 1, title: 'Pinned one', isPinned: true }),
        createEntry({ id: 2, title: 'Unpinned two', isPinned: false }),
      ],
      activeFilter: 'pinned',
    });
    render(<DiaryView />);
    expect(screen.getByText('Pinned one')).toBeInTheDocument();
    expect(screen.queryByText('Unpinned two')).not.toBeInTheDocument();
  });

  it('renders the entry-count subtitle for a populated diary', () => {
    seedStore({ entries: [createEntry({ id: 1 }), createEntry({ id: 2 })] });
    render(<DiaryView />);
    expect(screen.getByText('2 entries')).toBeInTheDocument();
  });

  it('opens the editor in place when "New entry" is clicked', async () => {
    const { user } = render(<DiaryView />);
    await user.click(screen.getByRole('button', { name: 'New entry' }));
    // The real openEditor action flips the store flag; the view swaps to the
    // editor region in response.
    expect(useDiaryStore.getState().isEditorOpen).toBe(true);
    expect(screen.getByRole('region', { name: 'New diary entry' })).toBeInTheDocument();
  });

  it('shows the editor region (replacing the body) when the editor is open', () => {
    seedStore({ isEditorOpen: true, selectedEntry: null });
    render(<DiaryView />);
    expect(screen.getByRole('region', { name: 'New diary entry' })).toBeInTheDocument();
  });

  it('retries the fetch from the load-error CTA', async () => {
    const fetchEntries = vi.fn();
    seedStore({ error: 'boom', fetchEntries });
    const { user } = render(<DiaryView />);
    // The mount effect fired one fetch; clicking retry fires another.
    fetchEntries.mockClear();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(fetchEntries).toHaveBeenCalledTimes(1);
  });

  it('opens the confirm dialog naming the entry when its remove button is clicked', async () => {
    const target = createEntry({ id: 7, title: 'Doomed entry' });
    seedStore({ entries: [target], viewMode: 'list' });
    const { user } = render(<DiaryView />);

    // The row's remove button is always in the DOM (just opacity-0 until hover).
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Delete entry')).toBeInTheDocument();
    // The description interpolates the entry title being removed.
    expect(within(dialog).getByText(/Doomed entry/)).toBeInTheDocument();
  });
});
