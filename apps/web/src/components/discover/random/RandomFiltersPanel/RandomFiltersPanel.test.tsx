import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import RandomFiltersPanel from './RandomFiltersPanel';

describe('RandomFiltersPanel', () => {
  it('renders the genre picker when expanded by default', () => {
    render(
      <RandomFiltersPanel included={['Action']} excluded={[]} disabled={false} onChange={vi.fn()} />
    );

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('Horror')).toBeInTheDocument();
  });
});
