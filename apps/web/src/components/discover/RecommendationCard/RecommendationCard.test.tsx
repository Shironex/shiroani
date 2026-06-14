import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AniListCommunityRecommendation } from '@shiroani/shared';
import RecommendationCard from './RecommendationCard';

const pair: AniListCommunityRecommendation = {
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

describe('RecommendationCard', () => {
  it('renders the recommended media title and net score', () => {
    render(<RecommendationCard pair={pair} connected onVote={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByText('+42')).toBeInTheDocument();
  });

  it('votes RATE_UP when the recommend button is pressed', async () => {
    const onVote = vi.fn();
    const { user } = render(<RecommendationCard pair={pair} connected onVote={onVote} />);

    await user.click(screen.getByRole('button', { name: 'Recommend' }));

    expect(onVote).toHaveBeenCalledWith(pair, 'RATE_UP');
  });

  it('disables the vote buttons when disconnected', () => {
    render(<RecommendationCard pair={pair} connected={false} />);

    expect(screen.getByRole('button', { name: 'Recommend' })).toBeDisabled();
  });
});
