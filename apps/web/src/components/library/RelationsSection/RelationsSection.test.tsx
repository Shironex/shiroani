import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetail } from '@shiroani/shared';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RelationsSection from './RelationsSection';

const ANILIST_ID = 9253;

const detail = {
  id: ANILIST_ID,
  relations: {
    edges: [
      {
        relationType: 'SEQUEL',
        node: { id: 201, title: { romaji: 'Steins;Gate 0' }, coverImage: {} },
      },
    ],
  },
} as unknown as AnimeDetail;

describe('RelationsSection', () => {
  beforeEach(() => {
    useAnimeDetailStore.setState({
      details: new Map(),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({ entries: [] });
  });

  it('renders the relation nodes from a resolved detail', () => {
    useAnimeDetailStore.setState({ details: new Map([[ANILIST_ID, detail]]) });
    render(<RelationsSection anilistId={ANILIST_ID} />);
    expect(screen.getByText('Steins;Gate 0')).toBeInTheDocument();
  });

  it('renders a loading skeleton while the detail is in flight', () => {
    useAnimeDetailStore.setState({ inFlight: new Set([ANILIST_ID]) });
    const { container } = render(<RelationsSection anilistId={ANILIST_ID} />);
    // No resolved relations yet — the skeleton placeholders are present.
    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(screen.queryByText('Steins;Gate 0')).not.toBeInTheDocument();
  });
});
