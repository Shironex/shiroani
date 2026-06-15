import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { AnimeDetailStreamingEpisode } from '@shiroani/shared';
import StreamingEpisodesSection from './StreamingEpisodesSection';

const episodes: AnimeDetailStreamingEpisode[] = [
  { title: 'Episode 1', thumbnail: '', url: 'https://example.com/1', site: 'Crunchyroll' },
  { title: 'Episode 2', thumbnail: '', url: 'https://example.com/2', site: 'Crunchyroll' },
  { title: 'Episode 3', thumbnail: '', url: 'https://example.com/3', site: 'Crunchyroll' },
];

/** Per-episode legal streaming links (thumbnail + provider) — each card opens that episode on the streaming site. */
const meta = {
  title: 'library/StreamingEpisodesSection',
  component: StreamingEpisodesSection,
  parameters: {
    // Each card is a button with a descriptive watch aria-label; thumbnails are decorative (alt="").
    a11y: { test: 'error' },
  },
  argTypes: {
    episodes: {
      description:
        'Streaming-episode entries from the cached AnimeDetail; renders nothing when empty and caps at 50 cards.',
    },
  },
} satisfies Meta<typeof StreamingEpisodesSection>;

export default meta;

type Story = StoryObj<typeof StreamingEpisodesSection>;

/** Each episode renders as a button with a "Watch …" accessible name (clicking opens a real external link, not asserted here). */
export const Default: Story = {
  args: { episodes },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = await canvas.findAllByRole('button');
    await expect(cards).toHaveLength(3);
    await expect(
      canvas.getByRole('button', { name: 'Watch "Episode 1" on Crunchyroll' })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Watch "Episode 3" on Crunchyroll' })
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { episodes: [] },
};
