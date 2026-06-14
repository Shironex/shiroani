import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import RandomSkeleton from './RandomSkeleton';

describe('RandomSkeleton', () => {
  it('renders the showcase placeholder layout', () => {
    const { container } = render(<RandomSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
