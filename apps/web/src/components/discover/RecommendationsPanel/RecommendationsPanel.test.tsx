import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AniListCommunityRecommendation } from '@shiroani/shared';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import RecommendationsPanel from './RecommendationsPanel';

function seed(overrides: Partial<ReturnType<typeof useDiscoverStore.getState>>) {
  useDiscoverStore.setState({
    recommendations: [],
    isRecommendationsLoading: false,
    recommendationsError: null,
    votingIds: new Set<number>(),
    ...overrides,
  });
}

const recommendation: AniListCommunityRecommendation = {
  id: 1,
  rating: 42,
  userRating: 'NO_RATING',
  media: { id: 100, title: { english: 'Spy x Family' } },
  mediaRecommendation: {
    id: 200,
    title: { english: 'Frieren' },
    coverImage: 'cover.jpg',
    format: 'TV',
    averageScore: 92,
  },
};

beforeEach(() => {
  seed({});
});

describe('RecommendationsPanel', () => {
  it('renders the empty state when there are no recommendations', () => {
    render(<RecommendationsPanel libraryIds={new Set()} connected onCardClick={vi.fn()} />);

    expect(screen.getByText(/no recommendations/i)).toBeInTheDocument();
  });

  it('renders recommendation cards when the store has data', () => {
    seed({ recommendations: [recommendation] });
    render(<RecommendationsPanel libraryIds={new Set()} connected onCardClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByText('+42')).toBeInTheDocument();
  });
});
