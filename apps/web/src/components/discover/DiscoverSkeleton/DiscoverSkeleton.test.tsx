import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import DiscoverSkeleton from './DiscoverSkeleton';

describe('DiscoverSkeleton', () => {
  it('renders a busy placeholder grid', () => {
    const { container } = render(<DiscoverSkeleton />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
