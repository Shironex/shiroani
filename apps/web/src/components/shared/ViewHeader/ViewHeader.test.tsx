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

  it('renders the title text as a heading', () => {
    render(<ViewHeader {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Moja lista' })).toBeInTheDocument();
  });

  it('renders the subtitle when provided and omits it otherwise', () => {
    const { rerender } = render(<ViewHeader {...baseProps} subtitle="Podtytuł" />);
    expect(screen.getByText('Podtytuł')).toBeInTheDocument();

    rerender(<ViewHeader {...baseProps} />);
    expect(screen.queryByText('Podtytuł')).not.toBeInTheDocument();
  });

  it('renders custom actions in the header', () => {
    render(<ViewHeader {...baseProps} actions={<button>Sortuj</button>} />);
    expect(screen.getByRole('button', { name: 'Sortuj' })).toBeInTheDocument();
  });

  it('renders only the title row when neither search nor filters are configured', () => {
    render(<ViewHeader icon={Heart} title="Ustawienia" subtitle="Konfiguracja" />);
    expect(screen.getByRole('heading', { name: 'Ustawienia' })).toBeInTheDocument();
    // No search box, no filter tablist, no buttons in the title-only variant.
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('uses the default search placeholder and overrides it when given one', () => {
    const { rerender } = render(<ViewHeader {...baseProps} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();

    rerender(<ViewHeader {...baseProps} searchPlaceholder="Szukaj anime" />);
    expect(screen.getByPlaceholderText('Szukaj anime')).toBeInTheDocument();
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

  it('exposes the search input with an accessible name matching the placeholder', () => {
    render(<ViewHeader {...baseProps} searchPlaceholder="Szukaj" />);
    expect(screen.getByRole('textbox', { name: 'Szukaj' })).toBeInTheDocument();
  });

  it('hides the clear button when the query is empty and shows it once non-empty', async () => {
    const onSearchChange = vi.fn();
    const { user, rerender } = render(
      <ViewHeader {...baseProps} searchQuery="" onSearchChange={onSearchChange} />
    );

    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    rerender(<ViewHeader {...baseProps} searchQuery="coś" onSearchChange={onSearchChange} />);

    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    await user.click(clearButton);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('renders filter tabs in a tablist and calls onFilterChange on click', async () => {
    const onFilterChange = vi.fn();
    const { user } = render(<ViewHeader {...baseProps} onFilterChange={onFilterChange} />);

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await user.click(screen.getByRole('tab', { name: 'Ulubione' }));
    expect(onFilterChange).toHaveBeenCalledWith('fav');
  });

  it('marks the active filter tab with aria-selected', () => {
    render(<ViewHeader {...baseProps} activeFilter="fav" />);

    expect(screen.getByRole('tab', { name: 'Ulubione' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Wszystkie' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('renders accessible view-mode toggles and fires onViewModeChange', async () => {
    const onViewModeChange = vi.fn();
    const { user } = render(
      <ViewHeader {...baseProps} viewMode="grid" onViewModeChange={onViewModeChange} />
    );

    const gridButton = screen.getByRole('button', { name: 'Grid view' });
    const listButton = screen.getByRole('button', { name: 'List view' });
    expect(gridButton).toBeInTheDocument();
    expect(listButton).toBeInTheDocument();

    await user.click(listButton);
    expect(onViewModeChange).toHaveBeenCalledWith('list');

    await user.click(gridButton);
    expect(onViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('does not render view mode toggles when onViewModeChange is not provided', () => {
    render(<ViewHeader {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Grid view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'List view' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
