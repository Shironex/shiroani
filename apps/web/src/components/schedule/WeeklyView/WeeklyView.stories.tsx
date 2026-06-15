import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import WeeklyView from './WeeklyView';

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
      coverImage: {},
      episodes: 12,
      status: 'RELEASING',
      genres: [],
      format: 'TV',
    },
  } as unknown as AiringAnime;
}

const ENTRIES: Record<string, AiringAnime[]> = {
  '2024-01-15': [makeAnime(1, '2024-01-15', 'Frieren')],
  '2024-01-17': [makeAnime(2, '2024-01-17', 'Bocchi')],
};

/**
 * Compact 7-column week grid — one column per weekday with event cards stacked
 * inside. Status is a coloured left border (live / soon / upcoming / done) and
 * library/subscription membership adds a tinted top edge. Cards are
 * keyboard-activatable buttons when `onAnimeClick` is supplied.
 */
const meta = {
  title: 'schedule/WeeklyView',
  component: WeeklyView,
  parameters: { a11y: { test: 'error' } },
  beforeEach: () => {
    // Cards render a SubscribeBellButton that reads the notification store; seed
    // it so membership is stable and the bell never touches IPC.
    useNotificationStore.setState({ subscribedIds: new Set<number>() });
  },
  argTypes: {
    onAnimeClick: { description: 'Opens the detail dialog for the clicked entry.' },
    libraryAnilistIds: { description: 'AniList ids tinted as library members.' },
    subscribedAnilistIds: { description: 'AniList ids tinted as notification subscriptions.' },
  },
} satisfies Meta<typeof WeeklyView>;

export default meta;

type Story = StoryObj<typeof WeeklyView>;

/** Empty week — every column shows its empty-state placeholder. */
export const Empty: Story = {
  args: {
    weekDays: WEEK_DAYS,
    getEntriesForDay: () => [],
    schedule: {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // DayColumnHeader renders the day-of-month for the first column.
    await expect(canvas.getAllByText('15').length).toBeGreaterThan(0);
  },
};

/** Populated — entries on two days; clicking a card opens the detail dialog. */
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
