import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import DiscoverCard from './DiscoverCard';

const media: DiscoverMedia = {
  id: 1,
  title: { english: 'Frieren' },
  coverImage: { large: 'cover.jpg' },
  episodes: 28,
  averageScore: 92,
};

describe('DiscoverCard', () => {
  it('renders the title and cover image', () => {
    render(<DiscoverCard media={media} />);

    expect(screen.getByRole('button', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByAltText('Frieren')).toBeInTheDocument();
  });

  it('fires onClick when activated', async () => {
    const onClick = vi.fn();
    const { user } = render(<DiscoverCard media={media} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Frieren' }));

    expect(onClick).toHaveBeenCalledWith(media);
  });

  it('calls onAddToLibrary from the hover action without bubbling the card click', async () => {
    const onClick = vi.fn();
    const onAddToLibrary = vi.fn();
    const { user } = render(
      <DiscoverCard media={media} onClick={onClick} onAddToLibrary={onAddToLibrary} />
    );

    await user.click(screen.getByRole('button', { name: 'Add to library' }));

    expect(onAddToLibrary).toHaveBeenCalledWith(media);
    expect(onClick).not.toHaveBeenCalled();
  });
});
