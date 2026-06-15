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
  const handlers = {
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onRefetch: vi.fn(),
    onOpenDetails: vi.fn(),
    onAddToLibrary: vi.fn(),
  };
  const result = render(
    <RandomShowcaseCard
      media={media}
      index={0}
      total={12}
      inLibrary={false}
      isLoading={false}
      {...handlers}
      {...overrides}
    />
  );
  return { ...result, ...handlers };
}

describe('RandomShowcaseCard', () => {
  it('renders the title and genre tags', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('Fantasy')).toBeInTheDocument();
  });

  it('advances to the next pick when shuffle is pressed', async () => {
    const { user, onNext } = renderCard();

    await user.click(screen.getByRole('button', { name: /shuffle/i }));

    expect(onNext).toHaveBeenCalled();
  });

  it('opens the detail when the title is clicked', async () => {
    const { user, onOpenDetails } = renderCard();

    await user.click(screen.getByRole('heading', { name: 'Frieren' }));

    expect(onOpenDetails).toHaveBeenCalled();
  });

  it('refetches a new pool from the refresh action', async () => {
    const { user, onRefetch } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Refresh suggestions' }));

    expect(onRefetch).toHaveBeenCalled();
  });

  it('shows the add-to-library action when not in the library', async () => {
    const { user, onAddToLibrary } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Add to library' }));

    expect(onAddToLibrary).toHaveBeenCalled();
  });

  it('hides the add action and shows the in-library tag when already added', () => {
    renderCard({ inLibrary: true });

    expect(screen.queryByRole('button', { name: 'Add to library' })).not.toBeInTheDocument();
    expect(screen.getByText('In library')).toBeInTheDocument();
  });

  it('disables shuffle and refresh while loading', () => {
    renderCard({ isLoading: true });

    expect(screen.getByRole('button', { name: /shuffle/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh suggestions' })).toBeDisabled();
  });

  it('reports the position within the pool', () => {
    renderCard({ index: 2, total: 12 });

    expect(screen.getByText('3 / 12')).toBeInTheDocument();
  });
});
