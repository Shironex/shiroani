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
});
