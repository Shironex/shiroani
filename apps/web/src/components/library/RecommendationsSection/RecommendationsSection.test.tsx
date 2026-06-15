import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetailRecommendation } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RecommendationsSection from './RecommendationsSection';

const recommendations: AnimeDetailRecommendation[] = [
  {
    mediaRecommendation: {
      id: 101,
      title: { romaji: 'Made in Abyss' },
      coverImage: {},
      format: 'TV',
      averageScore: 86,
    },
  },
];

describe('RecommendationsSection', () => {
  beforeEach(() => {
    useLibraryStore.setState({ entries: [] });
  });

  it('renders a card per recommendation node', () => {
    render(<RecommendationsSection recommendations={recommendations} />);
    expect(screen.getByText('Made in Abyss')).toBeInTheDocument();
  });

  it('renders nothing when there are no recommendations', () => {
    const { container } = render(<RecommendationsSection recommendations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
