import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import AnimeInfoMeta from './AnimeInfoMeta';

/**
 * Mid-section of the detail dialog: next-episode countdown, studios, genre and
 * tag chip rows, and the expandable synopsis. Sections render only when their
 * data is present; while AniList detail is loading the description shows a
 * skeleton.
 */
const meta = {
  title: 'schedule/anime-info/AnimeInfoMeta',
  component: AnimeInfoMeta,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    genres: { control: 'object', description: 'Genre labels rendered as chips.' },
    mainStudios: { control: 'object', description: 'Main studio names, joined with commas.' },
    loading: { control: 'boolean', description: 'Shows the description skeleton while true.' },
    language: { control: 'text', description: 'Active locale for date formatting.' },
  },
} satisfies Meta<typeof AnimeInfoMeta>;

export default meta;

type Story = StoryObj<typeof AnimeInfoMeta>;

/** Genres only — basic info before AniList detail loads. */
export const Default: Story = {
  args: {
    details: null,
    mainStudios: [],
    genres: ['Action', 'Fantasy'],
    nonSpoilerTags: [],
    loading: false,
    descExpanded: false,
    onToggleDesc: () => {},
    language: 'en',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Action')).toBeInTheDocument();
    await expect(canvas.getByText('Fantasy')).toBeInTheDocument();
  },
};

/** With studios — the studios line is added above the genres. */
export const WithStudios: Story = {
  args: {
    details: null,
    mainStudios: ['Madhouse'],
    genres: ['Adventure'],
    nonSpoilerTags: [],
    loading: false,
    descExpanded: false,
    onToggleDesc: () => {},
    language: 'en',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Madhouse')).toBeInTheDocument();
  },
};
