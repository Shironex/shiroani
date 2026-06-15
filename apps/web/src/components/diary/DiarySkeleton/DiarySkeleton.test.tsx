import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import DiarySkeleton from './DiarySkeleton';

describe('DiarySkeleton', () => {
  it('renders a busy placeholder rail', () => {
    const { container } = render(<DiarySkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders four placeholder rows', () => {
    const { container } = render(<DiarySkeleton />);
    // Each row carries a staggered animation delay; there are four of them.
    const rows = container.querySelectorAll('[style*="animation-delay"]');
    expect(rows).toHaveLength(4);
  });
});
