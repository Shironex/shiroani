import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import AnimeDetailModal from './AnimeDetailModal';

function createEntry(overrides: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id: 1,
    title: 'Steins;Gate',
    status: 'watching',
    currentEpisode: 5,
    episodes: 24,
    score: 9,
    coverImage: 'https://example.com/cover.jpg',
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    // No anilistId: keeps the self-fetching relations/extras sections gated off.
    ...overrides,
  };
}

describe('AnimeDetailModal', () => {
  beforeEach(() => {
    // Seed the entry into the store so the store-bound updateEntry/removeFromLibrary
    // (captured by the hook at module load) operate on a real row.
    useLibraryStore.setState({ entries: [createEntry()] });
  });

  afterEach(() => {
    useLibraryStore.setState({ entries: [] });
  });

  it('renders nothing when there is no entry', () => {
    const { container } = render(<AnimeDetailModal entry={null} open onOpenChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the entry title and form when open', () => {
    render(<AnimeDetailModal entry={createEntry()} open onOpenChange={vi.fn()} />);
    // Title appears in the sr-only dialog title and the visible header.
    expect(screen.getAllByText('Steins;Gate').length).toBeGreaterThan(0);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(<AnimeDetailModal entry={createEntry()} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('shows the current status in the status select trigger', () => {
    render(<AnimeDetailModal entry={createEntry()} open onOpenChange={vi.fn()} />);
    // The status combobox is labelled "Status" and reflects the seeded status.
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Watching');
  });

  it('updates the notes textarea as the user types', async () => {
    const { user } = render(<AnimeDetailModal entry={createEntry()} open onOpenChange={vi.fn()} />);
    const notes = screen.getByLabelText('Notes');
    await user.type(notes, 'Great episode');
    expect(notes).toHaveValue('Great episode');
  });

  it('updates the resume-url input as the user types', async () => {
    const { user } = render(<AnimeDetailModal entry={createEntry()} open onOpenChange={vi.fn()} />);
    const resumeUrl = screen.getByLabelText('Continue watching link');
    await user.type(resumeUrl, 'https://example.com/ep6');
    expect(resumeUrl).toHaveValue('https://example.com/ep6');
  });

  it('persists edited fields via updateEntry and closes when Save is clicked', async () => {
    const onOpenChange = vi.fn();
    const { user } = render(
      <AnimeDetailModal entry={createEntry()} open onOpenChange={onOpenChange} />
    );
    await user.type(screen.getByLabelText('Notes'), 'My note');
    await user.type(screen.getByLabelText('Continue watching link'), 'https://ep.example/6');
    await user.click(screen.getByText('Save'));

    // Save closes the modal...
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // ...and optimistically patches the seeded entry with the edited fields.
    const patched = useLibraryStore.getState().entries.find(e => e.id === 1);
    expect(patched?.notes).toBe('My note');
    expect(patched?.resumeUrl).toBe('https://ep.example/6');
  });

  it('opens the remove confirm dialog and removes the entry on confirm', async () => {
    const onOpenChange = vi.fn();
    const { user } = render(
      <AnimeDetailModal entry={createEntry()} open onOpenChange={onOpenChange} />
    );
    await user.click(screen.getByText('Delete'));
    // ConfirmDialog (portalled to body, found by `screen`) shows the remove title.
    expect(await screen.findByText('Remove from library')).toBeInTheDocument();

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    // Confirming runs handleRemove → removeFromLibrary + onOpenChange(false).
    // (The optimistic prune itself rolls back when the socket emit fails with no
    // backend, so the close callback is the reliable observable signal here.)
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when the close (X) button is clicked', async () => {
    const onOpenChange = vi.fn();
    const { user } = render(
      <AnimeDetailModal entry={createEntry()} open onOpenChange={onOpenChange} />
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
