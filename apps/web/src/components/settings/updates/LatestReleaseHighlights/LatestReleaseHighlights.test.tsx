import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { LatestReleaseHighlights } from './index';

describe('LatestReleaseHighlights', () => {
  it('renders the changelog preview card heading', () => {
    render(<LatestReleaseHighlights />);
    expect(screen.getByText("What's new in this version.")).toBeInTheDocument();
  });
});
