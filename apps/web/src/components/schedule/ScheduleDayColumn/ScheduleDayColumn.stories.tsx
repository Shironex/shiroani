import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import ScheduleDayColumn from './ScheduleDayColumn';

function makeAnime(id: number, title: string): AiringAnime {
  return {
    id,
    airingAt: 1717000000,
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

/**
 * One day column in the 7-column week grids. Owns the column shell — today
 * tint, sticky header, scroll list, empty state — and delegates each card to
 * the caller's `renderCard`, which receives the entry and its live/soon/done
 * status. With no entries it shows the `emptyLabel` placeholder.
 */
const meta = {
  title: 'schedule/ScheduleDayColumn',
  component: ScheduleDayColumn,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    day: { control: 'text', description: 'YYYY-MM-DD — drives the today tint + header.' },
    label: { control: 'text', description: 'Short weekday label shown in the header.' },
    now: { control: 'number', description: 'Current unix seconds — derives each card status.' },
    emptyLabel: { control: 'text', description: 'Copy shown when the day has no entries.' },
  },
} satisfies Meta<typeof ScheduleDayColumn>;

export default meta;

type Story = StoryObj<typeof ScheduleDayColumn>;

/** Empty column — the empty-state placeholder is shown. */
export const Empty: Story = {
  args: {
    day: '2024-01-15',
    label: 'MON',
    entries: [],
    now: 1717000000,
    renderCard: () => null,
    emptyLabel: 'no airings',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('MON')).toBeInTheDocument();
    await expect(canvas.getByText('no airings')).toBeInTheDocument();
  },
};

/** Populated column — renders one card per entry via `renderCard`. */
export const Populated: Story = {
  args: {
    day: '2024-01-15',
    label: 'MON',
    entries: [makeAnime(1, 'Frieren'), makeAnime(2, 'Bocchi')],
    now: 1717000000,
    emptyLabel: 'no airings',
    renderCard: anime => <div key={anime.id}>{anime.media.title.romaji}</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Frieren')).toBeInTheDocument();
    await expect(canvas.getByText('Bocchi')).toBeInTheDocument();
    await expect(canvas.queryByText('no airings')).not.toBeInTheDocument();
  },
};
