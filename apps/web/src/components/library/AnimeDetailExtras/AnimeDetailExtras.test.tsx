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
  recommendations: { nodes: [] },
  streamingEpisodes: [],
} as unknown as AnimeDetail;

describe('AnimeDetailExtras', () => {
  beforeEach(() => {
    useAnimeDetailStore.setState({
      details: new Map([[ANILIST_ID, detail]]),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({ entries: [] });
  });

  it('renders the AniList reference link and navigates on click', async () => {
    const onNavigate = vi.fn();
    const { user } = render(<AnimeDetailExtras anilistId={ANILIST_ID} onNavigate={onNavigate} />);
    const anilistButton = screen.getByText('AniList');
    await user.click(anilistButton);
    expect(onNavigate).toHaveBeenCalledWith('https://anilist.co/anime/9253');
  });
});
