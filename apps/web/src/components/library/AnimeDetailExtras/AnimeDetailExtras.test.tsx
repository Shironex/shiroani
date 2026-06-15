import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetail } from '@shiroani/shared';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import AnimeDetailExtras from './AnimeDetailExtras';

const ANILIST_ID = 9253;

const detail = {
  id: ANILIST_ID,
  idMal: 9253,
  siteUrl: 'https://anilist.co/anime/9253',
  recommendations: {
    nodes: [
      {
        mediaRecommendation: {
          id: 301,
          title: { romaji: 'Chaos;Head' },
          coverImage: {},
          format: 'TV',
          averageScore: 70,
        },
      },
    ],
  },
  streamingEpisodes: [
    { title: 'Episode 1', thumbnail: '', url: 'https://example.com/1', site: 'Crunchyroll' },
  ],
} as unknown as AnimeDetail;

function seed(d: AnimeDetail) {
  useAnimeDetailStore.setState({
    details: new Map([[ANILIST_ID, d]]),
    inFlight: new Set(),
    failed: new Set(),
  });
  useLibraryStore.setState({ entries: [] });
}

describe('AnimeDetailExtras', () => {
  beforeEach(() => {
    seed(detail);
  });

  it('renders the recommendations and streaming sections from the cached detail', () => {
    render(<AnimeDetailExtras anilistId={ANILIST_ID} onNavigate={vi.fn()} />);

    expect(screen.getByText('More like this')).toBeInTheDocument();
    expect(screen.getByText('Chaos;Head')).toBeInTheDocument();
    expect(screen.getByText('Watch episodes')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Watch "Episode 1" on Crunchyroll' })
    ).toBeInTheDocument();
  });

  it('navigates to the AniList siteUrl when the AniList button is clicked', async () => {
    const onNavigate = vi.fn();
    const { user } = render(<AnimeDetailExtras anilistId={ANILIST_ID} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: 'AniList' }));
    expect(onNavigate).toHaveBeenCalledWith('https://anilist.co/anime/9253');
  });

  it('navigates to the MyAnimeList url built from idMal when the MyAnimeList button is clicked', async () => {
    const onNavigate = vi.fn();
    const { user } = render(<AnimeDetailExtras anilistId={ANILIST_ID} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: 'MyAnimeList' }));
    expect(onNavigate).toHaveBeenCalledWith('https://myanimelist.net/anime/9253');
  });

  it('does not render the reference buttons when the detail has no siteUrl or idMal', () => {
    seed({ ...detail, siteUrl: undefined, idMal: undefined } as unknown as AnimeDetail);
    render(<AnimeDetailExtras anilistId={ANILIST_ID} onNavigate={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'AniList' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MyAnimeList' })).not.toBeInTheDocument();
  });
});
