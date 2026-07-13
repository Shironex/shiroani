import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryListItem from './LibraryListItem';

function createEntry(overrides: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id: 1,
    title: 'Steins;Gate',
    status: 'watching',
    currentEpisode: 5,
    episodes: 12,
    score: 9,
    coverImage: 'https://example.com/cover.jpg',
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('LibraryListItem', () => {
  beforeEach(() => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  });

  it('renders the anime title and score', () => {
    render(<LibraryListItem entry={createEntry()} onClick={vi.fn()} />);
    expect(screen.getByText('Steins;Gate')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('calls onClick with the entry when activated (selection mode off)', async () => {
    const entry = createEntry();
    const onClick = vi.fn();
    const { user } = render(<LibraryListItem entry={entry} onClick={onClick} />);
    await user.click(screen.getByText('Steins;Gate'));
    expect(onClick).toHaveBeenCalledWith(entry);
  });

  it('renders a checkbox role in selection mode', () => {
    useLibraryStore.setState({ selectionMode: true });
    render(<LibraryListItem entry={createEntry()} onClick={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('exposes a labelled progress bar', () => {
    render(
      <LibraryListItem entry={createEntry({ currentEpisode: 6, episodes: 12 })} onClick={vi.fn()} />
    );
    // progressAriaLabel = "Progress: {{percent}}%" → 6/12 = 50%
    expect(screen.getByLabelText('Progress: 50%')).toBeInTheDocument();
  });

  it('shows a dash placeholder when score is 0', () => {
    render(<LibraryListItem entry={createEntry({ score: 0 })} onClick={vi.fn()} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('shows a dash placeholder when score is undefined', () => {
    render(<LibraryListItem entry={createEntry({ score: undefined })} onClick={vi.fn()} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  describe('selection mode', () => {
    beforeEach(() => {
      useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
    });

    it('checkbox aria-checked is false when the row is not selected', () => {
      render(<LibraryListItem entry={createEntry()} onClick={vi.fn()} />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
    });

    it('checkbox aria-checked reflects the selected state', () => {
      const entry = createEntry();
      useLibraryStore.setState({ selectionMode: true, selectedIds: new Set([entry.id]) });
      render(<LibraryListItem entry={entry} onClick={vi.fn()} />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles the row into the store selection on click instead of calling onClick', async () => {
      const entry = createEntry();
      const onClick = vi.fn();
      const { user } = render(<LibraryListItem entry={entry} onClick={onClick} />);

      await user.click(screen.getByRole('checkbox'));

      expect(useLibraryStore.getState().selectedIds.has(entry.id)).toBe(true);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('toggles selection on keyboard Space without calling onClick', async () => {
      const entry = createEntry();
      const onClick = vi.fn();
      const { user } = render(<LibraryListItem entry={entry} onClick={onClick} />);

      const row = screen.getByRole('checkbox');
      row.focus();
      await user.keyboard('[Space]');

      expect(useLibraryStore.getState().selectedIds.has(entry.id)).toBe(true);
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
