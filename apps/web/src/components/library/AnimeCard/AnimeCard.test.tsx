import { render, screen } from '@/test/test-utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import AnimeCard from './AnimeCard';
import type { AnimeEntry } from '@shiroani/shared';

vi.mock('@/components/library/CountdownBadge', () => ({
  CountdownBadge: ({ episode }: { airingAt: number; episode: number }) => (
    <div data-testid="countdown-badge">Ep {episode}</div>
  ),
}));

function createEntry(overrides: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id: 1,
    title: 'Steins;Gate',
    status: 'watching',
    currentEpisode: 5,
    episodes: 12,
    score: 9,
    coverImage: 'https://example.com/cover.jpg',
    resumeUrl: 'https://example.com/watch/5',
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('AnimeCard', () => {
  const onSelect = vi.fn();
  const onContinue = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  });

  it('renders anime title', () => {
    render(<AnimeCard entry={createEntry()} onSelect={onSelect} />);

    expect(screen.getByText('Steins;Gate')).toBeInTheDocument();
  });

  it('renders progress text with total episodes', () => {
    render(
      <AnimeCard entry={createEntry({ currentEpisode: 5, episodes: 12 })} onSelect={onSelect} />
    );

    expect(screen.getByText('Ep. 5/12')).toBeInTheDocument();
  });

  it('renders progress text without total episodes', () => {
    render(
      <AnimeCard
        entry={createEntry({ currentEpisode: 3, episodes: undefined })}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Ep. 3')).toBeInTheDocument();
  });

  it('shows score badge when score is greater than 0', () => {
    render(<AnimeCard entry={createEntry({ score: 8 })} onSelect={onSelect} />);

    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('hides score badge when score is 0', () => {
    render(<AnimeCard entry={createEntry({ score: 0 })} onSelect={onSelect} />);

    expect(screen.queryByText('0/10')).not.toBeInTheDocument();
  });

  it('hides score badge when score is undefined', () => {
    render(<AnimeCard entry={createEntry({ score: undefined })} onSelect={onSelect} />);

    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
  });

  it('shows placeholder image when no coverImage', () => {
    render(<AnimeCard entry={createEntry({ coverImage: undefined })} onSelect={onSelect} />);

    expect(screen.getByText('No cover')).toBeInTheDocument();
    // No <img> tag rendered — the status dot has role="img" but no actual image
    expect(screen.queryByRole('img', { name: /Steins;Gate/i })).not.toBeInTheDocument();
  });

  it('shows cover image when coverImage is provided', () => {
    render(<AnimeCard entry={createEntry()} onSelect={onSelect} />);

    const img = screen.getByRole('img', { name: 'Steins;Gate' });
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('calls onSelect with entry when card is clicked', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} />);

    // The card's primary affordance is the stretched button carrying the
    // "{title}, {status}" accessible name.
    await user.click(screen.getByRole('button', { name: /Steins;Gate/ }));

    expect(onSelect).toHaveBeenCalledWith(entry);
  });

  it('shows action buttons on hover', async () => {
    const entry = createEntry();
    const { user } = render(
      <AnimeCard entry={entry} onSelect={onSelect} onContinue={onContinue} onRemove={onRemove} />
    );

    expect(screen.getByLabelText('Edit')).toBeInTheDocument();

    await user.hover(screen.getByText('Steins;Gate'));

    expect(screen.getByLabelText('Continue')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove')).toBeInTheDocument();
  });

  it('shows continue button only when resumeUrl exists', () => {
    const { rerender } = render(
      <AnimeCard
        entry={createEntry({ resumeUrl: undefined })}
        onSelect={onSelect}
        onContinue={onContinue}
      />
    );

    expect(screen.queryByLabelText('Continue')).not.toBeInTheDocument();

    rerender(
      <AnimeCard
        entry={createEntry({ resumeUrl: 'https://example.com/watch/5' })}
        onSelect={onSelect}
        onContinue={onContinue}
      />
    );

    expect(screen.getByLabelText('Continue')).toBeInTheDocument();
  });

  it('does not show continue button when onContinue is not provided', () => {
    render(
      <AnimeCard
        entry={createEntry({ resumeUrl: 'https://example.com/watch/5' })}
        onSelect={onSelect}
      />
    );

    expect(screen.queryByLabelText('Continue')).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} onRemove={onRemove} />);

    await user.hover(screen.getByText('Steins;Gate'));
    await user.click(screen.getByLabelText('Remove'));

    expect(onRemove).toHaveBeenCalledWith(entry);
  });

  it('does not call onSelect when remove button is clicked', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} onRemove={onRemove} />);

    await user.hover(screen.getByText('Steins;Gate'));
    await user.click(screen.getByLabelText('Remove'));

    // onSelect should only have been called 0 times from the button click
    // (stopPropagation prevents the card click)
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders status label from STATUS_CONFIG', () => {
    render(<AnimeCard entry={createEntry({ status: 'completed' })} onSelect={onSelect} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('does not show remove button when onRemove is not provided', () => {
    render(<AnimeCard entry={createEntry()} onSelect={onSelect} />);

    expect(screen.queryByLabelText('Remove')).not.toBeInTheDocument();
  });

  it('exposes a button role with the title+status accessible name (non-selection mode)', () => {
    render(<AnimeCard entry={createEntry({ status: 'watching' })} onSelect={onSelect} />);

    // ariaLabel = "{{title}}, {{status}}"
    expect(screen.getByRole('button', { name: 'Steins;Gate, Watching' })).toBeInTheDocument();
  });

  it('calls onSelect when Enter is pressed on the focused card (non-selection mode)', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /Steins;Gate/ });
    card.focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(entry);
  });

  it('calls onSelect when Space is pressed on the focused card (non-selection mode)', async () => {
    const entry = createEntry();
    const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /Steins;Gate/ });
    card.focus();
    await user.keyboard('[Space]');

    expect(onSelect).toHaveBeenCalledWith(entry);
  });

  describe('selection mode', () => {
    beforeEach(() => {
      useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
    });

    it('renders a checkbox role that is unchecked when not selected', () => {
      render(<AnimeCard entry={createEntry()} onSelect={onSelect} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    it('reflects aria-checked=true when the entry is in selectedIds', () => {
      const entry = createEntry();
      useLibraryStore.setState({ selectionMode: true, selectedIds: new Set([entry.id]) });
      render(<AnimeCard entry={entry} onSelect={onSelect} />);

      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles the entry into the store selection on click (does not call onSelect)', async () => {
      const entry = createEntry();
      const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} />);

      await user.click(screen.getByRole('checkbox'));

      expect(useLibraryStore.getState().selectedIds.has(entry.id)).toBe(true);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('toggles selection on keyboard Enter without calling onSelect', async () => {
      const entry = createEntry();
      const { user } = render(<AnimeCard entry={entry} onSelect={onSelect} />);

      const card = screen.getByRole('checkbox');
      card.focus();
      await user.keyboard('{Enter}');

      expect(useLibraryStore.getState().selectedIds.has(entry.id)).toBe(true);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not render the hover action buttons in selection mode', () => {
      render(
        <AnimeCard
          entry={createEntry()}
          onSelect={onSelect}
          onContinue={onContinue}
          onRemove={onRemove}
        />
      );

      expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Continue')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Remove')).not.toBeInTheDocument();
    });
  });
});
