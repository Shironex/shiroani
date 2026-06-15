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

function renderPanel(overrides: Partial<Parameters<typeof RecommendationsPanel>[0]> = {}) {
  return render(
    <RecommendationsPanel libraryIds={new Set()} connected onCardClick={vi.fn()} {...overrides} />
  );
}

beforeEach(() => {
  seed({});
});

describe('RecommendationsPanel', () => {
  it('renders the empty state when there are no recommendations', () => {
    renderPanel();

    expect(screen.getByText(/no recommendations/i)).toBeInTheDocument();
  });

  it('renders the skeleton while the first page loads', () => {
    seed({ isRecommendationsLoading: true });
    const { container } = renderPanel();

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText(/no recommendations/i)).not.toBeInTheDocument();
  });

  it('renders the error state with a retry action when the fetch failed', () => {
    seed({ recommendationsError: 'network down' });
    renderPanel();

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/no recommendations/i)).not.toBeInTheDocument();
  });

  it('renders recommendation cards when the store has data', () => {
    seed({ recommendations: [recommendation] });
    renderPanel();

    expect(screen.getByRole('button', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByText('+42')).toBeInTheDocument();
  });

  it('marks a recommended title already in the library', () => {
    seed({ recommendations: [recommendation] });
    renderPanel({ libraryIds: new Set([200]) });

    expect(screen.getByRole('button', { name: 'In library' })).toBeInTheDocument();
  });
});
