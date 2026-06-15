import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeDetailStreamingEpisode } from '@shiroani/shared';
import StreamingEpisodesSection from './StreamingEpisodesSection';

const episodes: AnimeDetailStreamingEpisode[] = [
  { title: 'Episode 1', thumbnail: '', url: 'https://example.com/1', site: 'Crunchyroll' },
  { title: 'Episode 2', thumbnail: '', url: 'https://example.com/2', site: 'Crunchyroll' },
  { title: 'Episode 3', thumbnail: '', url: 'https://example.com/3', site: 'Crunchyroll' },
];

const meta = {
  title: 'library/StreamingEpisodesSection',
  component: StreamingEpisodesSection,
} satisfies Meta<typeof StreamingEpisodesSection>;

export default meta;

type Story = StoryObj<typeof StreamingEpisodesSection>;

export const Default: Story = {
  args: { episodes },
};

export const Empty: Story = {
  args: { episodes: [] },
};
