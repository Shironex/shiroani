import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetailStreamingEpisode } from '@shiroani/shared';
import StreamingEpisodesSection from './StreamingEpisodesSection';

const episodes: AnimeDetailStreamingEpisode[] = [
  { title: 'Episode 1', thumbnail: '', url: 'https://example.com/1', site: 'Crunchyroll' },
  { title: 'Episode 2', thumbnail: '', url: 'https://example.com/2', site: 'Crunchyroll' },
];

function makeEpisodes(count: number): AnimeDetailStreamingEpisode[] {
  return Array.from({ length: count }, (_, i) => ({
    title: `Episode ${i + 1}`,
    thumbnail: '',
    url: `https://example.com/${i + 1}`,
    site: 'Crunchyroll',
  }));
}

describe('StreamingEpisodesSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when there are no episodes', () => {
    const { container } = render(<StreamingEpisodesSection episodes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the "Watch episodes" heading and a card per episode with the watch aria-label', () => {
    render(<StreamingEpisodesSection episodes={episodes} />);

    expect(screen.getByText('Watch episodes')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Watch "Episode 1" on Crunchyroll' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Watch "Episode 2" on Crunchyroll' })
    ).toBeInTheDocument();
  });

  it('caps the rendered episode cards at 50 even when more are provided', () => {
    render(<StreamingEpisodesSection episodes={makeEpisodes(60)} />);
    expect(screen.getAllByRole('button')).toHaveLength(50);
  });

  it('opens the episode url in a new tab when a card is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = render(<StreamingEpisodesSection episodes={episodes} />);

    await user.click(screen.getByRole('button', { name: 'Watch "Episode 1" on Crunchyroll' }));

    expect(openSpy).toHaveBeenCalledWith('https://example.com/1', '_blank', 'noopener,noreferrer');
  });
});
