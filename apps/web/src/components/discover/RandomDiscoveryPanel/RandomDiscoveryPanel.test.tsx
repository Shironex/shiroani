import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
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
  {
    id: 2,
    title: { english: 'Spy x Family', romaji: 'Spy x Family' },
    coverImage: { extraLarge: 'xl2.jpg', medium: 'med2.jpg' },
    episodes: 25,
    genres: ['Comedy'],
    averageScore: 85,
  },
];

function renderPanel(overrides: Partial<Parameters<typeof RandomDiscoveryPanel>[0]> = {}) {
  return render(
    <RandomDiscoveryPanel
      libraryIds={new Set()}
      excludedIds={new Set()}
      onCardClick={vi.fn()}
      onError={vi.fn()}
      {...overrides}
    />
  );
}

beforeEach(() => {
  seed({});
});

describe('RandomDiscoveryPanel', () => {
  it('renders the empty state when the pool is empty', () => {
    renderPanel();

    expect(screen.getByText(/no suggestions/i)).toBeInTheDocument();
  });

  it('renders the error state with a retry handler', async () => {
    const onError = vi.fn();
    seed({ error: 'network down' });
    const { user } = renderPanel({ onError });

    const retry = screen.getByRole('button', { name: /try again/i });
    await user.click(retry);

    expect(onError).toHaveBeenCalled();
  });

  it('renders the showcase card when the pool has a pick', () => {
    seed({ randomShuffled: pool });
    renderPanel();

    expect(screen.getByRole('heading', { name: 'Frieren' })).toBeInTheDocument();
  });

  it('opens the detail dialog when the showcase title is clicked', async () => {
    const onCardClick = vi.fn();
    seed({ randomShuffled: pool });
    const { user } = renderPanel({ onCardClick });

    // The title text now lives inside a real <button> nested in the heading.
    const heading = screen.getByRole('heading', { name: 'Frieren' });
    await user.click(within(heading).getByRole('button'));

    expect(onCardClick).toHaveBeenCalledWith(pool[0]);
  });

  it('drops excluded ids from the pool before rendering', () => {
    seed({ randomShuffled: pool });
    renderPanel({ excludedIds: new Set([1]) });

    // The first pick is excluded, so the remaining pick is shown instead.
    expect(screen.getByRole('heading', { name: 'Spy x Family' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Frieren' })).not.toBeInTheDocument();
  });
});
