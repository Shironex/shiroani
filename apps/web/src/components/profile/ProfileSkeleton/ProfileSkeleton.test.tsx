import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import ProfileSkeleton from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('renders a busy placeholder region', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
