import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import AnimeInfoLinks from './AnimeInfoLinks';

/**
 * Links section of the detail dialog: an optional YouTube trailer embed,
 * "where to watch" streaming-platform buttons, per-episode streaming links, and
 * external AniList / MyAnimeList reference links. Every section is conditional;
 * with no data the component renders nothing.
 */
const meta = {
  title: 'schedule/anime-info/AnimeInfoLinks',
  component: AnimeInfoLinks,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    streamingLinks: {
      control: 'object',
      description: 'STREAMING external links → platform buttons.',
    },
    onNavigate: { description: 'Opens a link target (in-app browser or system browser).' },
  },
} satisfies Meta<typeof AnimeInfoLinks>;

export default meta;

type Story = StoryObj<typeof AnimeInfoLinks>;

/** Empty — no detail and no streaming links renders nothing. */
export const Empty: Story = {
  args: {
    details: null,
    streamingLinks: [],
    onNavigate: fn(),
  },
};

/** With a streaming platform — clicking it calls `onNavigate` with the URL. */
export const WithStreaming: Story = {
  args: {
    details: null,
    streamingLinks: [
      { url: 'https://crunchyroll.com/frieren', site: 'Crunchyroll', type: 'STREAMING' },
    ],
    onNavigate: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Crunchyroll'));
    await waitFor(() =>
      expect(args.onNavigate).toHaveBeenCalledWith('https://crunchyroll.com/frieren')
    );
  },
};
