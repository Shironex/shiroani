import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetail } from '@shiroani/shared';
import AnimeInfoRecommendations from './AnimeInfoRecommendations';

vi.mock('@/components/discover/useAddDiscoverMediaToLibrary', () => ({
  useAddDiscoverMediaToLibrary: () => vi.fn(),
}));

describe('AnimeInfoRecommendations', () => {
  it('renders nothing when there are no recommendations', () => {
    const { container } = render(<AnimeInfoRecommendations details={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a recommendation card with its title', () => {
    const details = {
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 7,
              title: { romaji: 'Frieren' },
              coverImage: { medium: 'x.jpg' },
              format: 'TV',
              averageScore: 90,
            },
          },
        ],
      },
    } as unknown as AnimeDetail;

    render(<AnimeInfoRecommendations details={details} />);

    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });
});
