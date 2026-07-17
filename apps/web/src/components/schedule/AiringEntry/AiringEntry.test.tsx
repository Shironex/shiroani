import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import AiringEntry from './AiringEntry';

function makeAnime(overrides: Partial<AiringAnime['media']> = {}): AiringAnime {
  return {
    id: 1,
    airingAt: 1717003600,
    episode: 5,
    media: {
      id: 1,
      title: { romaji: 'Frieren' },
      coverImage: { medium: 'x.jpg' },
      episodes: 28,
      status: 'RELEASING',
      genres: [],
      format: 'TV',
      ...overrides,
    },
  } as unknown as AiringAnime;
}

const anime = makeAnime();

describe('AiringEntry', () => {
  it('renders the anime title for an airing slot', () => {
    render(<AiringEntry anime={anime} status="soon" now={1717000000} />);
    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });

  it('renders a compact countdown pill for an upcoming slot', () => {
    // 1717003600 − 1717000000 = 3600s = exactly one hour out.
    render(<AiringEntry anime={anime} status="soon" now={1717000000} />);
    expect(screen.getByText('T-1h')).toBeInTheDocument();
  });

  it('shows the LIVE badge and Watch CTA for a live slot, without a redundant Live pill', () => {
    render(<AiringEntry anime={anime} status="live" now={1717003600} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('shows the "Watched" pill for a past slot', () => {
    render(<AiringEntry anime={anime} status="done" now={1717010000} />);
    expect(screen.getByText('Watched')).toBeInTheDocument();
  });

  it('falls back to "Soon" copy when the slot is too far out for a countdown', () => {
    // > 48h out → formatCountdown returns '' and the entry shows the "Soon" label.
    const farFuture = makeAnime();
    farFuture.airingAt = 1717000000 + 60 * 3600;
    render(<AiringEntry anime={farFuture} status="soon" now={1717000000} />);
    expect(screen.getByText('Soon')).toBeInTheDocument();
  });

  it('exposes a keyboard-activatable button and invokes onClick with the entry', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <AiringEntry anime={anime} status="soon" now={1717000000} onClick={onClick} />
    );
    await user.click(screen.getByRole('button', { name: /Frieren/ }));
    expect(onClick).toHaveBeenCalledWith(anime);
  });

  it('renders a decorative cover image with an empty alt when a cover is present', () => {
    const { container } = render(<AiringEntry anime={anime} status="soon" now={1717000000} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('src', 'x.jpg');
  });
});
