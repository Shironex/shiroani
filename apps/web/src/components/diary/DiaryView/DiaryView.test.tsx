import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
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
  it('renders the empty-state CTA when there are no entries', () => {
    render(<DiaryView />);
    expect(screen.getByText('Diary')).toBeInTheDocument();
  });

  it('renders entry cards when the store has entries', () => {
    seedStore({ entries: [createEntry({ id: 1, title: 'Widoczny wpis' })] });
    render(<DiaryView />);
    expect(screen.getByText('Widoczny wpis')).toBeInTheDocument();
  });

  it('shows the editor page when the editor is open', () => {
    seedStore({ isEditorOpen: true, selectedEntry: null });
    render(<DiaryView />);
    // The editor's region landmark replaces the diary body.
    expect(screen.getByRole('region')).toBeInTheDocument();
  });
});
