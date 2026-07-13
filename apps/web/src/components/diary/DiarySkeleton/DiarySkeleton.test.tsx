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
    // Each row wraps its own cluster of pulsing skeletons; there are four rows,
    // and the stagger delay now lives on those pulsing children.
    const rows = container.querySelectorAll('[aria-busy="true"] > .relative');
    expect(rows).toHaveLength(4);
    rows.forEach(row => {
      expect(row.querySelector('[style*="animation-delay"]')).toBeInTheDocument();
    });
  });
});
