import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import RandomShowcaseCard from './RandomShowcaseCard';

const media: DiscoverMedia = {
  id: 1,
  title: { english: 'Frieren', romaji: 'Sousou no Frieren' },
  coverImage: { extraLarge: 'xl.jpg', medium: 'med.jpg' },
  episodes: 28,
  genres: ['Adventure', 'Fantasy'],
  averageScore: 92,
};

function renderCard(overrides: Partial<Parameters<typeof RandomShowcaseCard>[0]> = {}) {
  return render(
    <RandomShowcaseCard
      media={media}
      index={0}
      total={12}
      inLibrary={false}
      isLoading={false}
      onPrev={vi.fn()}
      onNext={vi.fn()}
      onRefetch={vi.fn()}
      onOpenDetails={vi.fn()}
      onAddToLibrary={vi.fn()}
      {...overrides}
    />
  );
}

describe('RandomShowcaseCard', () => {
  it('renders the title and genre tags', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
  });

  it('advances to the next pick when shuffle is pressed', async () => {
    const onNext = vi.fn();
    const { user } = renderCard({ onNext });

    await user.click(screen.getByRole('button', { name: /shuffle/i }));

    expect(onNext).toHaveBeenCalled();
  });
});
