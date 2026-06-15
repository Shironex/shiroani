import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import CountdownBadge from './CountdownBadge';

const HOUR = 3600;

describe('CountdownBadge', () => {
  it('renders a countdown label for an upcoming episode', () => {
    render(<CountdownBadge airingAt={Math.floor(Date.now() / 1000) + 3 * HOUR} episode={5} />);
    // The episode number is interpolated into the badge label.
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('renders nothing once the episode has aired', () => {
    const { container } = render(
      <CountdownBadge airingAt={Math.floor(Date.now() / 1000) - HOUR} episode={5} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
