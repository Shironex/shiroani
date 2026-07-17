import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { SubscribeBellButton } from './index';

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
 * Icon button that subscribes / unsubscribes the user from airing notifications
 * for one anime, reading membership from `useNotificationStore`. It renders the
 * outline bell when not subscribed and the filled bell when subscribed; the
 * tooltip copy flips to match. The store's `subscribe`/`unsubscribe` actions are
 * stubbed per story so the toggle never touches IPC or the socket.
 */
const meta = {
  title: 'schedule/SubscribeBellButton',
  component: SubscribeBellButton,
  parameters: { a11y: { test: 'error' } },
  args: { anime },
} satisfies Meta<typeof SubscribeBellButton>;

export default meta;

type Story = StoryObj<typeof SubscribeBellButton>;

/** Not subscribed — clicking the bell calls `subscribe` with the entry. */
export const NotSubscribed: Story = {
  beforeEach: () => {
    useNotificationStore.setState({
      subscribedIds: new Set<number>(),
      subscribe: fn(),
      unsubscribe: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bell = canvas.getByRole('button');
    await userEvent.click(bell);
    await waitFor(() =>
      expect(useNotificationStore.getState().subscribe).toHaveBeenCalledWith(anime)
    );
  },
};

/** Already subscribed — clicking the bell calls `unsubscribe` with the media id. */
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
    const bell = canvas.getByRole('button');
    await userEvent.click(bell);
    await waitFor(() =>
      expect(useNotificationStore.getState().unsubscribe).toHaveBeenCalledWith(1)
    );
  },
};

/**
 * `alwaysVisible` + `noTooltip` — the always-shown, tooltip-free variant used in
 * the detail dialog header. The button carries its own accessible name and
 * `aria-pressed`, so nothing auto-shows when a dialog opens.
 */
export const AlwaysVisibleNoTooltip: Story = {
  args: { alwaysVisible: true, noTooltip: true },
  beforeEach: () => {
    useNotificationStore.setState({
      subscribedIds: new Set<number>(),
      subscribe: fn(),
      unsubscribe: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bell = canvas.getByRole('button', { name: 'Enable notifications' });
    await expect(bell).toHaveAttribute('aria-pressed', 'false');
    await expect(bell).not.toHaveClass('opacity-0');
  },
};
