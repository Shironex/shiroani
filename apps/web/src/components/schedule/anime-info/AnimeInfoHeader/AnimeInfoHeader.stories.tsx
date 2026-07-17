import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import AnimeInfoHeader from './AnimeInfoHeader';

const anime = {
  id: 1,
  airingAt: 1717000000,
  episode: 1,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: {},
    episodes: 28,
    status: 'RELEASING',
    genres: [],
  },
} as unknown as AiringAnime;

/**
 * Banner header for the detail dialog: a blurred banner / cover backdrop, the
 * cover thumbnail, the title block (with optional English + native titles), and
 * an always-visible subscribe bell. The bell reads its state from
 * `useNotificationStore` and carries an accessible name + `aria-pressed` that
 * track the subscription; it renders without a tooltip so nothing auto-shows
 * when the dialog opens.
 */
const meta = {
  title: 'schedule/anime-info/AnimeInfoHeader',
  component: AnimeInfoHeader,
  parameters: { a11y: { test: 'error' } },
  args: {
    anime,
    title: 'Frieren: Beyond Journey’s End',
    details: null,
    coverUrl: 'https://placehold.co/200x280',
    bannerUrl: 'https://placehold.co/800x300',
    accentColor: '#7c6f9c',
  },
} satisfies Meta<typeof AnimeInfoHeader>;

export default meta;

type Story = StoryObj<typeof AnimeInfoHeader>;

/** Not subscribed — outline bell; clicking it subscribes via the store. */
export const Default: Story = {
  beforeEach: () => {
    useNotificationStore.setState({
      subscribedIds: new Set<number>(),
      subscribe: fn(),
      unsubscribe: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Frieren: Beyond Journey’s End')).toBeInTheDocument();
    const bell = canvas.getByRole('button', { name: 'Enable notifications' });
    await expect(bell).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(bell);
    await waitFor(() =>
      expect(useNotificationStore.getState().subscribe).toHaveBeenCalledWith(anime)
    );
  },
};

/** Subscribed — filled bell, aria-pressed true, "disable" copy. */
export const Subscribed: Story = {
  beforeEach: () => {
    useNotificationStore.setState({
      subscribedIds: new Set<number>([1]),
      subscribe: fn(),
      unsubscribe: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Disable notifications' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  },
};
