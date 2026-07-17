import { describe, expect, it } from 'vitest';
import { Film } from 'lucide-react';
import { fireEvent, render, screen } from '@/test/test-utils';
import { ImageWithFallback, mediaTitle } from '@/components/shared/ImageWithFallback';

const fallback = <Film data-testid="fallback-icon" aria-hidden="true" />;

describe('ImageWithFallback', () => {
  it('renders the image when a src is provided', () => {
    render(<ImageWithFallback src="/cover.jpg" alt="Okładka" fallback={fallback} />);
    expect(screen.getByRole('img', { name: 'Okładka' })).toHaveAttribute('src', '/cover.jpg');
    expect(screen.queryByTestId('fallback-icon')).not.toBeInTheDocument();
  });

  it('shows the fallback when there is no src', () => {
    render(<ImageWithFallback alt="" fallback={fallback} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });

  it('swaps to the fallback after the image fails to load', () => {
    render(<ImageWithFallback src="/broken.jpg" alt="Okładka" fallback={fallback} />);
    fireEvent.error(screen.getByRole('img', { name: 'Okładka' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });

  it('merges the frame size classes with the base frame', () => {
    const { container } = render(
      <ImageWithFallback
        src="/cover.jpg"
        alt="Okładka"
        className="w-10 h-14 rounded-md"
        fallback={fallback}
      />
    );
    expect(container.firstChild).toHaveClass('w-10', 'h-14', 'rounded-md', 'overflow-hidden');
  });
});

describe('mediaTitle', () => {
  it('prefers english, then romaji, then native, then the fallback', () => {
    expect(mediaTitle({ english: 'Frieren', romaji: 'Sousou no Frieren' }, 'Untitled')).toBe(
      'Frieren'
    );
    expect(mediaTitle({ romaji: 'Sousou no Frieren' }, 'Untitled')).toBe('Sousou no Frieren');
    expect(mediaTitle({ native: '葬送のフリーレン' }, 'Untitled')).toBe('葬送のフリーレン');
    expect(mediaTitle({}, 'Untitled')).toBe('Untitled');
  });
});
