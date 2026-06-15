import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import type { SlotStatus } from '../schedule-utils';
import ScheduleDayColumn from './ScheduleDayColumn';

function makeAnime(id: number, airingAt: number, title: string): AiringAnime {
  return {
    id,
    airingAt,
    episode: 1,
    media: {
      id,
      title: { romaji: title },
      coverImage: {},
      episodes: 12,
      status: 'RELEASING',
      genres: [],
      format: 'TV',
    },
  } as unknown as AiringAnime;
}

describe('ScheduleDayColumn', () => {
  it('renders the header label and the empty-state copy when there are no entries', () => {
    render(
      <ScheduleDayColumn
        day="2000-01-01"
        label="MON"
        entries={[]}
        now={1717000000}
        renderCard={() => null}
        emptyLabel="Brak odcinków"
      />
    );
    expect(screen.getByText('MON')).toBeInTheDocument();
    expect(screen.getByText('Brak odcinków')).toBeInTheDocument();
  });

  it('renders one card per entry via renderCard and hides the empty state', () => {
    render(
      <ScheduleDayColumn
        day="2000-01-01"
        label="MON"
        entries={[makeAnime(1, 1717000000, 'Frieren'), makeAnime(2, 1717000000, 'Bocchi')]}
        now={1717000000}
        renderCard={anime => <div key={anime.id}>{anime.media.title.romaji}</div>}
        emptyLabel="Brak odcinków"
      />
    );
    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.getByText('Bocchi')).toBeInTheDocument();
    expect(screen.queryByText('Brak odcinków')).not.toBeInTheDocument();
  });

  it('passes the derived slot status for each entry to renderCard', () => {
    const renderCard = vi.fn<(anime: AiringAnime, status: SlotStatus) => null>(() => null);
    const now = 1717000000;
    render(
      <ScheduleDayColumn
        day="2000-01-01"
        label="MON"
        entries={[
          makeAnime(1, now - 7200, 'Past'), // > 30m ago → done
          makeAnime(2, now, 'Current'), // within the 30m live window
          makeAnime(3, now + 7200, 'Future'), // ahead → soon
        ]}
        now={now}
        renderCard={renderCard}
        emptyLabel="Brak"
      />
    );
    const statuses = renderCard.mock.calls.map(([, status]) => status);
    expect(statuses).toEqual(['done', 'live', 'soon']);
  });
});
