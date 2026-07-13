import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import ProfileSkeleton from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('renders a busy placeholder region', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('mirrors the real dashboard layout (280px round-avatar rail + tiles)', () => {
    const { container } = render(<ProfileSkeleton />);
    // Round avatar in the sidebar rail (vs. the old square banner avatar).
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    // Fixed 280px sidebar rail matching the loaded sidebar width.
    expect(container.querySelector('.w-\\[280px\\]')).toBeInTheDocument();
    // Several pulsing skeleton blocks stand in for the stat tiles + bars.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(10);
  });
});
