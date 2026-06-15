import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryView from './LibraryView';

beforeEach(() => {
  // Stable, non-loading, error-free empty library so the empty-state CTA renders
  // deterministically without a backend.
  useLibraryStore.setState({
    entries: [],
    activeFilter: 'all',
    searchQuery: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    viewMode: 'grid',
    isLoading: false,
    error: null,
    isDetailOpen: false,
    selectedEntry: null,
    selectionMode: false,
    selectedIds: new Set(),
  });
});

describe('LibraryView', () => {
  it('renders the library title and the empty-state CTA when there are no entries', () => {
    render(<LibraryView />);
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
  });
});
