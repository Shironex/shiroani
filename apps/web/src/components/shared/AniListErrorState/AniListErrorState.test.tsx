import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { AniListErrorState } from '@/components/shared/AniListErrorState';

describe('AniListErrorState', () => {
  it('renders nothing when there is no error', () => {
    const { container } = render(<AniListErrorState error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('classifies a network error and shows the network title', () => {
    render(<AniListErrorState error="Failed to fetch" />);
    expect(screen.getByRole('heading', { name: 'Connection error' })).toBeInTheDocument();
    expect(
      screen.getByText('Could not connect to AniList. Check your internet connection.')
    ).toBeInTheDocument();
  });

  it('classifies a rate-limit error', () => {
    render(<AniListErrorState error="429 rate limit exceeded" />);
    expect(screen.getByRole('heading', { name: 'Too many requests' })).toBeInTheDocument();
  });

  it('classifies an api-disabled error', () => {
    render(<AniListErrorState error="The API is temporarily disabled" />);
    expect(
      screen.getByRole('heading', { name: 'AniList API is temporarily disabled' })
    ).toBeInTheDocument();
  });

  it('shows the raw message as the body for an unknown error kind', () => {
    render(<AniListErrorState error="Something weird happened" />);
    expect(screen.getByRole('heading', { name: 'Failed to load data' })).toBeInTheDocument();
    // For the unknown kind the body falls back to the raw error string.
    expect(screen.getByText('Something weird happened')).toBeInTheDocument();
  });

  it('renders a retry button that fires onRetry', async () => {
    const onRetry = vi.fn();
    const { user } = render(<AniListErrorState error="Failed to fetch" onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Try again' });
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when no onRetry is provided', () => {
    render(<AniListErrorState error="Failed to fetch" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies a provided className to the outer container', () => {
    const { container } = render(
      <AniListErrorState error="Failed to fetch" className="my-custom-class" />
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
