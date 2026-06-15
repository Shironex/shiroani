import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import DailyView from './DailyView';

const DAY = '2024-01-15';
// Airing must fall on DAY so the timeline window includes the slot.
const airingAt = Math.floor(new Date(2024, 0, 15, 18, 0, 0).getTime() / 1000);

const anime = {
  id: 1,
  airingAt,
  episode: 5,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: { medium: 'https://placehold.co/42x56' },
    episodes: 28,
    status: 'RELEASING',
    genres: [],
    format: 'TV',
  },
} as unknown as AiringAnime;

/**
 * Adaptive vertical hour-axis timeline for a single day. The hour rail expands
 * around content hours and collapses long empty stretches; on today's date a
 * live-now indicator is mapped onto the same non-uniform axis. With no entries
 * it shows the day's empty state. Slots are `AiringEntry` rows wired to
 * `onAnimeClick`.
 */
const meta = {
  title: 'schedule/DailyView',
  component: DailyView,
  parameters: { a11y: { test: 'error' } },
  beforeEach: () => {
    useNotificationStore.setState({ subscribedIds: new Set<number>() });
  },
  argTypes: {
    day: {
      control: 'text',
      description: 'YYYY-MM-DD — the rendered day (drives the today check).',
    },
    onAnimeClick: { description: 'Opens the detail dialog for the clicked slot.' },
  },
} satisfies Meta<typeof DailyView>;

export default meta;

type Story = StoryObj<typeof DailyView>;

/** Empty day — the "nothing airs" empty state. */
export const Empty: Story = {
  args: { entries: [], day: DAY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Nothing airs that day')).toBeInTheDocument();
  },
};

/** Populated — one slot on the timeline; clicking it opens the detail dialog. */
export const Populated: Story = {
  args: { entries: [anime], day: DAY, onAnimeClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const slot = canvas.getByRole('button', { name: /Frieren/ });
    await userEvent.click(slot);
    await waitFor(() => expect(args.onAnimeClick).toHaveBeenCalledWith(anime));
  },
};
