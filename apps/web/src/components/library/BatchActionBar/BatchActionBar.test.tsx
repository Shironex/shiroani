import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import BatchActionBar from './BatchActionBar';

describe('BatchActionBar', () => {
  beforeEach(() => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
  });

  it('shows the slim hint bar when nothing is selected', () => {
    render(<BatchActionBar />);
    expect(screen.getByText('Select entries to run a batch operation')).toBeInTheDocument();
  });

  it('shows the selected count and bulk controls when entries are selected', () => {
    useLibraryStore.setState({ selectedIds: new Set([1, 2]) });
    render(<BatchActionBar />);
    expect(screen.getByText('2 entries selected')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
