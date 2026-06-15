import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryStats from './LibraryStats';

function makeEntry(id: number, status: AnimeEntry['status'], score: number): AnimeEntry {
  return {
    id,
    title: `Anime #${id}`,
    status,
    currentEpisode: 12,
    episodes: 12,
    score,
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };
}

describe('LibraryStats', () => {
  beforeEach(() => {
    useLibraryStore.setState({ entries: [] });
  });

  it('computes total entries and total episodes', () => {
    useLibraryStore.setState({
      entries: [makeEntry(1, 'watching', 9), makeEntry(2, 'completed', 8)],
    });
    render(<LibraryStats />);
    // Total entries = 2.
    expect(screen.getByText('2')).toBeInTheDocument();
    // Total episodes = 24.
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('renders the average score from scored entries only', () => {
    useLibraryStore.setState({
      entries: [makeEntry(1, 'watching', 9), makeEntry(2, 'plan_to_watch', 0)],
    });
    render(<LibraryStats />);
    // Average over a single scored entry = 9.0.
    expect(screen.getByText('9.0')).toBeInTheDocument();
  });
});
