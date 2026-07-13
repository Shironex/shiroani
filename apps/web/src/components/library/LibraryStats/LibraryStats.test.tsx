import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryStats from './LibraryStats';

function makeEntry(
  id: number,
  status: AnimeEntry['status'],
  score: number,
  currentEpisode = 12
): AnimeEntry {
  return {
    id,
    title: `Anime #${id}`,
    status,
    currentEpisode,
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

  it('shows "–" for the average when there are no scored entries', () => {
    useLibraryStore.setState({
      entries: [makeEntry(1, 'watching', 0), makeEntry(2, 'plan_to_watch', 0)],
    });
    render(<LibraryStats />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('hides the distribution bar and legend when the store is empty', () => {
    render(<LibraryStats />);
    expect(screen.queryByText('Status distribution')).not.toBeInTheDocument();
  });

  it('renders the distribution bar and legend once there are entries', () => {
    useLibraryStore.setState({
      entries: [makeEntry(1, 'watching', 9), makeEntry(2, 'completed', 8)],
    });
    render(<LibraryStats />);
    expect(screen.getByText('Status distribution')).toBeInTheDocument();
  });

  it('reflects the count of watching entries and the per-status breakdown', () => {
    // Distinct counts so no number is ambiguous: 5 watching, 2 completed, 1 plan.
    // Episodes use distinct totals so the episode sum (20) is unique too.
    useLibraryStore.setState({
      entries: [
        makeEntry(1, 'watching', 8, 1),
        makeEntry(2, 'watching', 7, 1),
        makeEntry(3, 'watching', 6, 1),
        makeEntry(4, 'watching', 5, 1),
        makeEntry(5, 'watching', 4, 1),
        makeEntry(6, 'completed', 9, 7),
        makeEntry(7, 'completed', 9, 8),
        makeEntry(8, 'plan_to_watch', 0, 1),
      ],
    });
    render(<LibraryStats />);

    // Total entries = 8 (StatCard) and also appears in the distribution header.
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);

    // Watching count = 5 — surfaces in both the Watching StatCard and its legend
    // chip ("Watching" appears as both a stat label and a status label).
    expect(screen.getAllByText('Watching').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);

    // Other non-empty statuses render their own legend chips.
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Plan to Watch')).toBeInTheDocument();
  });
});
