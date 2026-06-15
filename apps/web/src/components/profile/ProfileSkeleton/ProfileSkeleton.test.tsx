import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import ProfileSkeleton from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('renders a busy placeholder region', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders the four stat tiles and six breakdown bars', () => {
    const { container } = render(<ProfileSkeleton />);
    // Each Skeleton primitive is an animate-pulse block.
    const blocks = container.querySelectorAll('.animate-pulse');
    // 1 banner + 1 avatar + 2 name lines + 4 stat tiles + 6 bars = 14.
    expect(blocks.length).toBe(14);
  });
});
