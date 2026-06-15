import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import AnimeCard from './AnimeCard';

const entry: AnimeEntry = {
  id: 1,
  title: 'Steins;Gate',
  status: 'watching',
  currentEpisode: 5,
  episodes: 24,
  score: 9,
  coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/9253.jpg',
  resumeUrl: 'https://example.com/watch/5',
  addedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};

/**
 * Cover-art library tile for a single anime entry: status pill, score chip,
 * progress bar, per-provider sync badges and an optional airing countdown, with
 * hover action buttons (continue/edit/remove). In selection mode the tile
 * becomes a checkbox that toggles the store selection instead of opening detail.
 */
const meta = {
  title: 'library/AnimeCard',
  component: AnimeCard,
  parameters: {
    // role=button/checkbox with aria-label + tabIndex; cover <img> has alt.
    a11y: { test: 'error' },
  },
  argTypes: {
    entry: {
      description: 'The anime library entry to render (title, cover, status, progress, score).',
    },
    onSelect: {
      description: 'Fired with the entry when the card is activated (also the edit action).',
    },
    onContinue: {
      description: 'Optional — shows a continue button when set and the entry has a resumeUrl.',
    },
    onRemove: { description: 'Optional — shows a remove button on hover when set.' },
    nextAiring: {
      description: 'Optional next-episode airing info; renders a countdown badge when present.',
    },
  },
  beforeEach: () => {
    // Selection mode off so the hover-action overlay (not the checkbox) renders.
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  },
  args: { onSelect: fn(), onContinue: fn(), onRemove: fn() },
} satisfies Meta<typeof AnimeCard>;

export default meta;

type Story = StoryObj<typeof AnimeCard>;

export const Watching: Story = {
  args: { entry },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // The card root exposes role=button with accessible name "{title}, {status}".
    await userEvent.click(canvas.getByRole('button', { name: /Steins;Gate/i }));
    await expect(args.onSelect).toHaveBeenCalled();
  },
};

export const Completed: Story = {
  args: { entry: { ...entry, status: 'completed', currentEpisode: 24 } },
};

export const NoCover: Story = {
  args: { entry: { ...entry, coverImage: undefined } },
};

/**
 * Multi-select mode: the tile renders as a checkbox. Activating it toggles the
 * store selection (reflected via aria-checked) rather than calling onSelect.
 */
export const SelectionMode: Story = {
  args: { entry },
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox');
    await expect(checkbox).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).toHaveAttribute('aria-checked', 'true'));
  },
};
