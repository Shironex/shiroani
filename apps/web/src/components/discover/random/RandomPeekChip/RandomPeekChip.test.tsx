import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import RandomPeekChip from './RandomPeekChip';

const media: DiscoverMedia = {
  id: 1,
  title: { english: 'Frieren' },
  coverImage: { medium: 'cover.jpg' },
};

describe('RandomPeekChip', () => {
  it('renders the media title and fires onClick', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <RandomPeekChip media={media} direction="prev" onClick={onClick} inLibrary={false} />
    );

    expect(screen.getByText('Frieren')).toBeInTheDocument();

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('labels the chip by its direction for the previous pick', () => {
    render(<RandomPeekChip media={media} direction="prev" onClick={vi.fn()} inLibrary={false} />);

    expect(screen.getByRole('button', { name: 'Previous: Frieren' })).toBeInTheDocument();
  });

  it('labels the chip by its direction for the next pick', () => {
    render(<RandomPeekChip media={media} direction="next" onClick={vi.fn()} inLibrary={false} />);

    expect(screen.getByRole('button', { name: 'Next: Frieren' })).toBeInTheDocument();
  });

  it('marks a chip whose title is already in the library', () => {
    const { container } = render(
      <RandomPeekChip media={media} direction="prev" onClick={vi.fn()} inLibrary />
    );

    // The check mark is now a lucide Check icon inside the same title paragraph.
    expect(container.querySelector('svg.lucide-check')).toBeInTheDocument();
  });
});
