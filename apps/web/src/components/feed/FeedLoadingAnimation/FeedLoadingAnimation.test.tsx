import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import FeedLoadingAnimation from './FeedLoadingAnimation';

describe('FeedLoadingAnimation', () => {
  it('renders the localized loading label', () => {
    render(<FeedLoadingAnimation />);
    // EN default label from the `feed` namespace.
    expect(screen.getByText('Loading news')).toBeInTheDocument();
  });

  it('marks the decorative SVG as hidden from assistive tech', () => {
    const { container } = render(<FeedLoadingAnimation />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
