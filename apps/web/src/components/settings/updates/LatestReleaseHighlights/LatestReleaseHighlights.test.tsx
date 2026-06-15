import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { LatestReleaseHighlights } from './index';

describe('LatestReleaseHighlights', () => {
  it('renders the changelog preview card heading', () => {
    render(<LatestReleaseHighlights />);
    expect(screen.getByText("What's new in this version.")).toBeInTheDocument();
  });

  it('renders the latest release version line', () => {
    render(<LatestReleaseHighlights />);
    // The version line is rendered as `v{version} — {date}`; assert the `v` prefix
    // is present so we know a release was resolved and the rows rendered.
    expect(screen.getByText(/^v\d/)).toBeInTheDocument();
  });
});
