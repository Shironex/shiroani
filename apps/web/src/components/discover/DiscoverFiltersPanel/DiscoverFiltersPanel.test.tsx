import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DiscoverFiltersPanel from './DiscoverFiltersPanel';

describe('DiscoverFiltersPanel', () => {
  it('renders the collapsed filters header', () => {
    render(<DiscoverFiltersPanel filters={{}} disabled={false} connected onChange={vi.fn()} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('expands the facet controls when the header is clicked', async () => {
    const { user } = render(
      <DiscoverFiltersPanel filters={{}} disabled={false} connected onChange={vi.fn()} />
    );

    await user.click(screen.getByText('Filters'));

    expect(screen.getByText('Score range')).toBeInTheDocument();
  });
});
