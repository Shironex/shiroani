import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetailRecommendation, AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RecommendationsSection from './RecommendationsSection';
import { RecommendationCard } from './RecommendationsSection.parts';

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
  {
    mediaRecommendation: {
      id: 102,
      title: { romaji: 'Mushishi' },
      coverImage: {},
      format: 'TV',
      averageScore: 84,
    },
  },
];

function makeEntry(overrides: Partial<AnimeEntry>): AnimeEntry {
  return {
    id: 1,
    title: 'Made in Abyss',
    status: 'watching',
    currentEpisode: 0,
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('RecommendationsSection', () => {
  beforeEach(() => {
    useLibraryStore.setState({ entries: [], selectedEntry: null, isDetailOpen: false });
  });

  it('renders the "More like this" heading and a card per recommendation', () => {
    render(<RecommendationsSection recommendations={recommendations} />);

    expect(screen.getByText('More like this')).toBeInTheDocument();
    expect(screen.getByText('Made in Abyss')).toBeInTheDocument();
    expect(screen.getByText('Mushishi')).toBeInTheDocument();
  });

  it('renders nothing when there are no recommendations', () => {
    const { container } = render(<RecommendationsSection recommendations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels a not-in-library recommendation as "Add ... to library"', () => {
    render(<RecommendationsSection recommendations={recommendations} />);
    expect(
      screen.getByRole('button', { name: 'Add "Made in Abyss" to library' })
    ).toBeInTheDocument();
  });

  it('labels an in-library recommendation as "Open ... in library" and opens detail on click', async () => {
    const entry = makeEntry({ id: 9, anilistId: 101 });
    useLibraryStore.setState({ entries: [entry] });

    const { user } = render(<RecommendationsSection recommendations={recommendations} />);

    const openButton = screen.getByRole('button', { name: 'Open "Made in Abyss" in library' });
    await user.click(openButton);

    const state = useLibraryStore.getState();
    expect(state.isDetailOpen).toBe(true);
    expect(state.selectedEntry).toEqual(entry);
  });
});

describe('RecommendationCard', () => {
  beforeEach(() => {
    useLibraryStore.setState({ entries: [], selectedEntry: null, isDetailOpen: false });
  });

  const node = recommendations[0].mediaRecommendation;

  it('calls onAdd with the adapted media when a not-in-library card is clicked', async () => {
    const onAdd = vi.fn();
    const { user } = render(<RecommendationCard node={node} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Add "Made in Abyss" to library' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ id: 101, title: { romaji: 'Made in Abyss' } })
    );
  });

  it('does not call onAdd for an in-library card (opens detail instead)', async () => {
    const entry = makeEntry({ id: 9, anilistId: 101 });
    const onAdd = vi.fn();
    const { user } = render(<RecommendationCard node={node} libraryEntry={entry} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Open "Made in Abyss" in library' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(useLibraryStore.getState().isDetailOpen).toBe(true);
  });
});
