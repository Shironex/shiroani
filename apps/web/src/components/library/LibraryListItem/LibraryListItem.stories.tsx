import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryListItem from './LibraryListItem';

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
 * Compact one-row representation of a library entry for the list view:
 * thumbnail, title + episode progress, status pill, sync badges, a labelled
 * progress bar and a score. In selection mode the row becomes a checkbox that
 * toggles the store selection rather than opening detail.
 */
const meta = {
  title: 'library/LibraryListItem',
  component: LibraryListItem,
  parameters: {
    // role=button/checkbox with aria-label + tabIndex; progress bar is labelled.
    a11y: { test: 'error' },
  },
  argTypes: {
    entry: { description: 'The anime library entry to render as a list row.' },
    onClick: {
      description: 'Fired with the entry when the row is activated (selection mode off).',
    },
    nextAiring: {
      description: 'Optional next-episode airing info; renders a countdown badge when present.',
    },
  },
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  },
  args: { onClick: fn() },
} satisfies Meta<typeof LibraryListItem>;

export default meta;

type Story = StoryObj<typeof LibraryListItem>;

export const Default: Story = {
  args: { entry },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Steins;Gate/i }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const NoScore: Story = {
  args: { entry: { ...entry, score: 0 } },
};

/**
 * Multi-select mode: the row renders as a checkbox. Activating it toggles the
 * store selection (reflected via aria-checked) rather than calling onClick.
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
