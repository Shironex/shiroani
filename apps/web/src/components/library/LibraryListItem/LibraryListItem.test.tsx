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
});
