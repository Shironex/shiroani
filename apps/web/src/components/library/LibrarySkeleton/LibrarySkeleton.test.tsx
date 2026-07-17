import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import LibrarySkeleton from './LibrarySkeleton';

describe('LibrarySkeleton', () => {
  it('renders a busy grid container', () => {
    const { container } = render(<LibrarySkeleton />);
    const grid = container.querySelector('[aria-busy="true"]');
    expect(grid).toBeInTheDocument();
  });

  it('renders the expected number of placeholder cards (14)', () => {
    const { container } = render(<LibrarySkeleton />);
    const grid = container.querySelector('[aria-busy="true"]');
    expect(grid?.children).toHaveLength(14);
  });

  it('renders skeleton placeholders inside each card', () => {
    const { container } = render(<LibrarySkeleton />);
    // Each card contains multiple Skeleton elements (cover, pills, title, bar).
    // Assert a stable lower bound rather than an exact count.
    const skeletons = container.querySelectorAll('[data-slot="skeleton"], .animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(14);
  });

  it('renders a busy list container with 14 row placeholders in list mode', () => {
    const { container } = render(<LibrarySkeleton viewMode="list" />);
    const list = container.querySelector('[aria-busy="true"]');
    expect(list).toBeInTheDocument();
    expect(list?.children).toHaveLength(14);
  });
});
