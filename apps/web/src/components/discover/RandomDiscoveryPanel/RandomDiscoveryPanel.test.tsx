import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import RandomDiscoveryPanel from './RandomDiscoveryPanel';

function seed(overrides: Partial<ReturnType<typeof useDiscoverStore.getState>>) {
  useDiscoverStore.setState({
    randomShuffled: [],
    randomIncludedGenres: [],
    randomExcludedGenres: [],
    isRandomLoading: false,
    error: null,
    ...overrides,
  });
}

const pool: DiscoverMedia[] = [
  {
    id: 1,
    title: { english: 'Frieren', romaji: 'Sousou no Frieren' },
    coverImage: { extraLarge: 'xl.jpg', medium: 'med.jpg' },
    episodes: 28,
    genres: ['Adventure'],
    averageScore: 92,
  },
];

beforeEach(() => {
  seed({});
});

describe('RandomDiscoveryPanel', () => {
  it('renders the empty state when the pool is empty', () => {
    render(
      <RandomDiscoveryPanel
        libraryIds={new Set()}
        excludedIds={new Set()}
        onCardClick={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText(/no suggestions/i)).toBeInTheDocument();
  });

  it('renders the showcase card when the pool has a pick', () => {
    seed({ randomShuffled: pool });
    render(
      <RandomDiscoveryPanel
        libraryIds={new Set()}
        excludedIds={new Set()}
        onCardClick={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Frieren' })).toBeInTheDocument();
  });
});
