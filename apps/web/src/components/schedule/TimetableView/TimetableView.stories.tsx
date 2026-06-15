import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import TimetableView from './TimetableView';

const WEEK_DAYS = [
  '2024-01-15',
  '2024-01-16',
  '2024-01-17',
  '2024-01-18',
  '2024-01-19',
  '2024-01-20',
  '2024-01-21',
];

function makeAnime(id: number, day: string, title: string): AiringAnime {
  const [y, m, d] = day.split('-').map(Number);
  return {
    id,
    airingAt: Math.floor(new Date(y, m - 1, d, 18, 0, 0).getTime() / 1000),
    episode: 3,
    media: {
      id,
      title: { romaji: title },
      coverImage: { large: 'https://placehold.co/200x280' },
      episodes: 12,
      status: 'RELEASING',
      genres: [],
      format: 'TV',
    },
  } as unknown as AiringAnime;
}

const ENTRIES: Record<string, AiringAnime[]> = {
  '2024-01-15': [makeAnime(1, '2024-01-15', 'Frieren')],
};

/**
 * Poster board — 7 columns, one per day, filled with cinematic poster cards.
 * Time and episode float as mono pills over the cover; the title overlays the
 * bottom via a gradient. Cards are keyboard-activatable buttons when
 * `onAnimeClick` is supplied.
 */
const meta = {
  title: 'schedule/TimetableView',
  component: TimetableView,
  parameters: { a11y: { test: 'error' } },
  beforeEach: () => {
    useNotificationStore.setState({ subscribedIds: new Set<number>() });
  },
  argTypes: {
    onAnimeClick: { description: 'Opens the detail dialog for the clicked entry.' },
  },
} satisfies Meta<typeof TimetableView>;

export default meta;

type Story = StoryObj<typeof TimetableView>;

/** Empty week — each column shows its empty placeholder. */
export const Empty: Story = {
  args: {
    weekDays: WEEK_DAYS,
    getEntriesForDay: () => [],
    schedule: {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // getDayNumber('2024-01-15') === 15, surfaced via DayColumnHeader.
    await expect(canvas.getAllByText('15').length).toBeGreaterThan(0);
  },
};

/** Populated — one poster; clicking it opens the detail dialog. */
export const Populated: Story = {
  args: {
    weekDays: WEEK_DAYS,
    getEntriesForDay: (day: string) => ENTRIES[day] ?? [],
    schedule: ENTRIES,
    onAnimeClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('button', { name: 'Frieren' });
    await userEvent.click(card);
    await waitFor(() => expect(args.onAnimeClick).toHaveBeenCalledWith(ENTRIES['2024-01-15'][0]));
  },
};
