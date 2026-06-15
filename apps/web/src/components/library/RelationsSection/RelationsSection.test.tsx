import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeDetail, AnimeEntry } from '@shiroani/shared';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RelationsSection from './RelationsSection';

const ANILIST_ID = 9253;
const SEQUEL_ID = 201;

const detail = {
  id: ANILIST_ID,
  relations: {
    edges: [
      {
        relationType: 'SEQUEL',
        node: { id: SEQUEL_ID, title: { romaji: 'Steins;Gate 0' }, coverImage: {} },
      },
      {
        relationType: 'SIDE_STORY',
        node: { id: 202, title: { romaji: 'Steins;Gate: Egg of Time' }, coverImage: {} },
      },
    ],
  },
} as unknown as AnimeDetail;

const emptyDetail = {
  id: ANILIST_ID,
  relations: { edges: [] },
} as unknown as AnimeDetail;

function makeEntry(overrides: Partial<AnimeEntry>): AnimeEntry {
  return {
    id: 1,
    title: 'Steins;Gate 0',
    status: 'watching',
    currentEpisode: 0,
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('RelationsSection', () => {
  beforeEach(() => {
    useAnimeDetailStore.setState({
      details: new Map(),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({ entries: [], selectedEntry: null, isDetailOpen: false });
  });

  it('renders the "Related" heading and a card per relation edge with the localized type label', () => {
    useAnimeDetailStore.setState({ details: new Map([[ANILIST_ID, detail]]) });
    render(<RelationsSection anilistId={ANILIST_ID} />);

    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(screen.getByText('Steins;Gate 0')).toBeInTheDocument();
    expect(screen.getByText('Steins;Gate: Egg of Time')).toBeInTheDocument();
    // Relation-type labels are localized from the relationType enum.
    expect(screen.getByText('Sequel')).toBeInTheDocument();
    expect(screen.getByText('Side story')).toBeInTheDocument();
  });

  it('renders the empty hint when the detail has no relation edges', () => {
    useAnimeDetailStore.setState({ details: new Map([[ANILIST_ID, emptyDetail]]) });
    render(<RelationsSection anilistId={ANILIST_ID} />);

    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(screen.getByText('No related entries')).toBeInTheDocument();
  });

  it('makes an in-library relation an actionable "Open in library" button and opens it on click', async () => {
    useAnimeDetailStore.setState({ details: new Map([[ANILIST_ID, detail]]) });
    const entry = makeEntry({ id: 7, anilistId: SEQUEL_ID });
    useLibraryStore.setState({ entries: [entry] });

    const { user } = render(<RelationsSection anilistId={ANILIST_ID} />);

    const openButton = screen.getByRole('button', { name: 'Open in library' });
    expect(openButton).toBeEnabled();

    await user.click(openButton);

    const state = useLibraryStore.getState();
    expect(state.isDetailOpen).toBe(true);
    expect(state.selectedEntry).toEqual(entry);
  });

  it('renders a relation not in the library as a disabled "Not in library" button', () => {
    useAnimeDetailStore.setState({ details: new Map([[ANILIST_ID, detail]]) });
    render(<RelationsSection anilistId={ANILIST_ID} />);

    const notInLibrary = screen.getAllByRole('button', { name: 'Not in library' });
    expect(notInLibrary.length).toBe(2);
    notInLibrary.forEach(btn => expect(btn).toBeDisabled());
  });

  it('renders a loading skeleton (no relation cards) while the detail is in flight', () => {
    useAnimeDetailStore.setState({ inFlight: new Set([ANILIST_ID]) });
    const { container } = render(<RelationsSection anilistId={ANILIST_ID} />);

    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(screen.queryByText('Steins;Gate 0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the empty hint (not a skeleton) when the fetch has failed with no detail', () => {
    useAnimeDetailStore.setState({ failed: new Set([ANILIST_ID]) });
    render(<RelationsSection anilistId={ANILIST_ID} />);

    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(screen.getByText('No related entries')).toBeInTheDocument();
  });
});
