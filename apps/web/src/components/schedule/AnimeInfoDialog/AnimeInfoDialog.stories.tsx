import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import AnimeInfoDialog from './AnimeInfoDialog';

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
 * Modal detail sheet opened from an airing entry. It fetches full AniList
 * detail over the socket on open and falls back to the schedule-entry basics
 * (title, format, episode count) while that request is pending or fails — which
 * is exactly what happens against the dead test backend, so the dialog renders
 * its fallback content deterministically.
 *
 * `useScheduleStore` is seeded non-empty so any schedule view mounted alongside
 * it short-circuits its fetch effect and never opens a reconnecting socket.
 * The notification + library stores are seeded so the bell and recommendations
 * read stable, socket-free state.
 */
const meta = {
  title: 'schedule/AnimeInfoDialog',
  component: AnimeInfoDialog,
  parameters: {
    // Portals to document.body — render its Docs preview in an iframe so the overlay + scroll-lock stay inside the preview block.
    docs: { story: { inline: false, iframeHeight: 620 } },
    a11y: { test: 'error' },
  },
  beforeEach: () => {
    useScheduleStore.setState({ schedule: { '2025-01-01': [] }, isLoading: false });
    useLibraryStore.setState({ entries: [] });
    useNotificationStore.setState({ subscribedIds: new Set<number>() });
  },
  argTypes: {
    open: { control: 'boolean', description: 'Controls dialog visibility.' },
    onOpenChange: { description: 'Called when the dialog requests open/close.' },
  },
} satisfies Meta<typeof AnimeInfoDialog>;

export default meta;

type Story = StoryObj<typeof AnimeInfoDialog>;

/** Closed — the dialog renders nothing. */
export const Closed: Story = {
  args: { anime, open: false, onOpenChange: fn() },
};

/**
 * Open with the schedule-entry fallback. The detail fetch fails against the
 * test backend, so the dialog shows the basic title from the entry. Radix
 * portals the content to `document.body`, so assertions query there.
 */
export const Open: Story = {
  args: { anime, open: true, onOpenChange: fn() },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    // The title shows in both the sr-only DialogTitle and the visible header.
    const titles = await body.findAllByText('Frieren');
    await expect(titles.length).toBeGreaterThan(0);
  },
};
