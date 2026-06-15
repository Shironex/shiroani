import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import LibrarySkeleton from './LibrarySkeleton';

describe('LibrarySkeleton', () => {
  it('renders a busy grid of placeholder cards', () => {
    const { container } = render(<LibrarySkeleton />);
    const grid = container.querySelector('[aria-busy="true"]');
    expect(grid).toBeInTheDocument();
    expect(grid?.children).toHaveLength(14);
  });
});
