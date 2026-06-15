import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeEntry } from '@shiroani/shared';
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
});
