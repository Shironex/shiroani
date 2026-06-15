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
  format: 'TV',
};

describe('DiscoverCard', () => {
  it('renders the title and cover image', () => {
    render(<DiscoverCard media={media} />);

    expect(screen.getByRole('button', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByAltText('Frieren')).toBeInTheDocument();
  });

  it('renders the score chip when a score is present', () => {
    render(<DiscoverCard media={media} />);

    expect(screen.getByText('9.2')).toBeInTheDocument();
  });

  it('omits the score chip when the score is zero or missing', () => {
    render(<DiscoverCard media={{ ...media, averageScore: 0 }} />);

    // The 9.2 score chip is gone; the episode subtitle ("28 ep.") still renders.
    expect(screen.queryByText('9.2')).not.toBeInTheDocument();
    expect(screen.getByText('28 ep.')).toBeInTheDocument();
  });

  it('shows the no-cover placeholder when there is no cover URL', () => {
    render(<DiscoverCard media={{ ...media, coverImage: {} }} />);

    expect(screen.getByText('No cover')).toBeInTheDocument();
    expect(screen.queryByAltText('Frieren')).not.toBeInTheDocument();
  });

  it('falls back to the placeholder after the cover image fails to load', async () => {
    render(<DiscoverCard media={media} />);

    const img = screen.getByAltText('Frieren');
    img.dispatchEvent(new Event('error'));

    expect(await screen.findByText('No cover')).toBeInTheDocument();
  });

  it('fires onClick with the media when activated by mouse', async () => {
    const onClick = vi.fn();
    const { user } = render(<DiscoverCard media={media} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Frieren' }));

    expect(onClick).toHaveBeenCalledWith(media);
  });

  it('opens the card on Enter and Space keypresses', async () => {
    const onClick = vi.fn();
    const { user } = render(<DiscoverCard media={media} onClick={onClick} />);

    const card = screen.getByRole('button', { name: 'Frieren' });
    card.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
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

  it('disables the add action and labels it as in-library when already added', async () => {
    const onAddToLibrary = vi.fn();
    const { user } = render(
      <DiscoverCard media={media} inLibrary onAddToLibrary={onAddToLibrary} />
    );

    const inLibraryButton = screen.getByRole('button', { name: 'In library' });
    expect(inLibraryButton).toBeDisabled();

    await user.click(inLibraryButton);
    expect(onAddToLibrary).not.toHaveBeenCalled();
  });

  it('omits the add action entirely when no onAddToLibrary handler is given', () => {
    render(<DiscoverCard media={media} />);

    expect(screen.queryByRole('button', { name: 'Add to library' })).not.toBeInTheDocument();
  });
});
