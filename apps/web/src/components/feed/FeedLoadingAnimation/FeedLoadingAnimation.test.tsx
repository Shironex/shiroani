import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import FeedLoadingAnimation from './FeedLoadingAnimation';

describe('FeedLoadingAnimation', () => {
  it('renders the localized loading label', () => {
    render(<FeedLoadingAnimation />);
    // EN default label from the `feed` namespace.
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
