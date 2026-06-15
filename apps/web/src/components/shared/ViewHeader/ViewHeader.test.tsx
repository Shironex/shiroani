import { describe, expect, it, vi, afterEach } from 'vitest';
import { Heart } from 'lucide-react';
import { render, screen } from '@/test/test-utils';
import { ViewHeader } from '@/components/shared/ViewHeader';

const filters = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'fav', label: 'Ulubione' },
];

const baseProps = {
  icon: Heart,
  title: 'Moja lista',
  searchQuery: '',
  onSearchChange: vi.fn(),
  filters,
  activeFilter: 'all' as const,
  onFilterChange: vi.fn(),
};

describe('ViewHeader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the title text', () => {
    render(<ViewHeader {...baseProps} />);
    expect(screen.getByText('Moja lista')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<ViewHeader {...baseProps} subtitle="Podtytuł" />);
    expect(screen.getByText('Podtytuł')).toBeInTheDocument();
  });

  it('shows the search input with current value and calls onSearchChange on typing', async () => {
    const onSearchChange = vi.fn();
    const { user } = render(
      <ViewHeader {...baseProps} searchQuery="test" onSearchChange={onSearchChange} />
    );

    const input = screen.getByPlaceholderText('Search...');
    expect(input).toHaveValue('test');

    await user.type(input, 'a');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('shows clear button when searchQuery is non-empty and clicking clears the query', async () => {
    const onSearchChange = vi.fn();
    const { user, rerender } = render(
      <ViewHeader {...baseProps} searchQuery="" onSearchChange={onSearchChange} />
    );

    const clearButtons = screen.queryAllByRole('button');
    expect(
      clearButtons.every(btn => btn.textContent === 'Wszystkie' || btn.textContent === 'Ulubione')
    ).toBe(true);

    rerender(<ViewHeader {...baseProps} searchQuery="coś" onSearchChange={onSearchChange} />);

    const allButtons = screen.getAllByRole('button');
    const clearButton = allButtons.find(
      btn => btn.textContent !== 'Wszystkie' && btn.textContent !== 'Ulubione'
    );
    expect(clearButton).toBeDefined();

    await user.click(clearButton!);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('renders filter tabs and calls onFilterChange on click', async () => {
    const onFilterChange = vi.fn();
    const { user } = render(<ViewHeader {...baseProps} onFilterChange={onFilterChange} />);

    expect(screen.getByText('Wszystkie')).toBeInTheDocument();
    expect(screen.getByText('Ulubione')).toBeInTheDocument();

    await user.click(screen.getByText('Ulubione'));
    expect(onFilterChange).toHaveBeenCalledWith('fav');
  });

  it('applies active styling to the active filter', () => {
    render(<ViewHeader {...baseProps} activeFilter="fav" />);

    const favButton = screen.getByText('Ulubione').closest('button')!;
    const allButton = screen.getByText('Wszystkie').closest('button')!;

    expect(favButton.className).toContain('bg-primary/15');
    expect(allButton.className).not.toContain('bg-primary/15');
  });

  it('renders view mode toggles when onViewModeChange is provided', async () => {
    const onViewModeChange = vi.fn();
    const { user } = render(
      <ViewHeader {...baseProps} viewMode="grid" onViewModeChange={onViewModeChange} />
    );

    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBe(2);

    const iconOnlyButtons = allButtons.filter(btn => btn.textContent === '');
    expect(iconOnlyButtons.length).toBe(2);

    await user.click(iconOnlyButtons[1]);
    expect(onViewModeChange).toHaveBeenCalledWith('list');

    await user.click(iconOnlyButtons[0]);
    expect(onViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('does not render view mode toggles when onViewModeChange is not provided', () => {
    render(<ViewHeader {...baseProps} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
