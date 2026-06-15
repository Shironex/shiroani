import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetailStreamingEpisode } from '@shiroani/shared';
import StreamingEpisodesSection from './StreamingEpisodesSection';

const episodes: AnimeDetailStreamingEpisode[] = [
  { title: 'Episode 1', thumbnail: '', url: 'https://example.com/1', site: 'Crunchyroll' },
  { title: 'Episode 2', thumbnail: '', url: 'https://example.com/2', site: 'Crunchyroll' },
];

describe('StreamingEpisodesSection', () => {
  it('renders a card per streaming episode', () => {
    render(<StreamingEpisodesSection episodes={episodes} />);
    expect(screen.getByText('Episode 1')).toBeInTheDocument();
    expect(screen.getByText('Episode 2')).toBeInTheDocument();
  });

  it('renders nothing when there are no episodes', () => {
    const { container } = render(<StreamingEpisodesSection episodes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
