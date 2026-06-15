import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import BatchActionBar from './BatchActionBar';

describe('BatchActionBar', () => {
  beforeEach(() => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset selection + entries so leaked state can't bleed into sibling suites.
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set(), entries: [] });
  });

  it('shows the slim hint bar when nothing is selected', () => {
    render(<BatchActionBar />);
    expect(screen.getByText('Select entries to run a batch operation')).toBeInTheDocument();
    // The status/score controls only appear once something is selected.
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows the selected count and bulk controls when entries are selected', () => {
    useLibraryStore.setState({ selectedIds: new Set([1, 2]) });
    render(<BatchActionBar />);
    expect(screen.getByText('2 entries selected')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    // Both Radix Select triggers render with their placeholder/aria-labels.
    expect(screen.getByRole('combobox', { name: 'Change status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Set score' })).toBeInTheDocument();
  });

  it('exits selection mode when "Done" is clicked (zero selected)', async () => {
    const { user } = render(<BatchActionBar />);
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(useLibraryStore.getState().selectionMode).toBe(false);
  });

  it('exits selection mode when "Done" is clicked (with a selection)', async () => {
    useLibraryStore.setState({ selectedIds: new Set([1, 2]) });
    const { user } = render(<BatchActionBar />);
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(useLibraryStore.getState().selectionMode).toBe(false);
  });

  it('opens the confirm dialog when "Delete" is clicked', async () => {
    useLibraryStore.setState({ selectedIds: new Set([1, 2]) });
    const { user } = render(<BatchActionBar />);
    await user.click(screen.getByText('Delete'));
    // ConfirmDialog is portalled to document.body; `screen` searches it.
    expect(await screen.findByText('Delete selected')).toBeInTheDocument();
  });

  it('runs batchRemove and clears the selection when the delete is confirmed', async () => {
    // Confirming the dialog invokes the store-bound batchRemove. We assert the
    // selection-clearing effect it owns directly (cleared ids + exited mode),
    // rather than spying — the hook captured the action reference at module
    // load, so a post-hoc getState() spy would not be intercepted. The
    // optimistic entry prune itself rolls back when the socket emit fails with
    // no backend, so it is not a reliable signal in jsdom.
    useLibraryStore.setState({ selectedIds: new Set([1, 2]) });
    const { user } = render(<BatchActionBar />);
    await user.click(screen.getByText('Delete'));
    expect(await screen.findByText('Delete selected')).toBeInTheDocument();
    // The ConfirmDialog confirm button also reads "Delete", so scope the query
    // to the portalled alertdialog to avoid matching the bar's own Delete button.
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    const state = useLibraryStore.getState();
    expect(state.selectedIds.size).toBe(0);
    expect(state.selectionMode).toBe(false);
  });
});
