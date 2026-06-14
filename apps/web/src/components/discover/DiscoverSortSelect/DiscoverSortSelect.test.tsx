import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DiscoverSortSelect from './DiscoverSortSelect';

describe('DiscoverSortSelect', () => {
  it('renders the sort trigger with its accessible label', () => {
    render(<DiscoverSortSelect value="score" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: /sort/i })).toBeInTheDocument();
  });
});
