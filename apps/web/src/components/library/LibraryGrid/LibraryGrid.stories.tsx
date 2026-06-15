import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryGrid from './LibraryGrid';

const withFixedSize: Decorator = Story => (
  <div style={{ height: '90vh', width: '100%' }}>
    <Story />
  </div>
);

function makeEntry(id: number): AnimeEntry {
  return {
    id,
    title: `Anime #${id}`,
    status: 'watching',
    currentEpisode: (id % 12) + 1,
    episodes: 12,
    score: (id % 10) + 1,
    coverImage: undefined,
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };
}

const entries = Array.from({ length: 24 }, (_, i) => makeEntry(i + 1));

/** Virtualized grid of anime cards (react-window) sized to its container. */
const meta = {
  title: 'library/LibraryGrid',
  component: LibraryGrid,
  parameters: { layout: 'fullscreen', a11y: { test: 'error' } },
  argTypes: {
    entries: { description: 'Anime entries rendered as virtualized cards.' },
    nextAiringMap: {
      description: 'Map of AniList id → next-airing info, shown as a per-card countdown badge.',
    },
    onSelect: { description: 'Called with the entry when a card is activated (opens the editor).' },
    onContinue: {
      description: 'Called with the entry when its “Continue” action is used.',
    },
    onRemove: { description: 'Called with the entry when its remove action is used.' },
  },
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  },
  args: {
    entries,
    nextAiringMap: new Map(),
    onSelect: fn(),
    onContinue: fn(),
    onRemove: fn(),
  },
  decorators: [withFixedSize],
} satisfies Meta<typeof LibraryGrid>;

export default meta;

type Story = StoryObj<typeof LibraryGrid>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    // The fixed-size decorator gives the grid a measured width, so cards render.
    // AnimeCard's "open" overlay is a role="button" named "{{title}}, {{status}}".
    const cards = await c.findAllByRole('button', { name: /Anime #/ });
    await userEvent.click(cards[0]);
    await waitFor(() => expect(args.onSelect).toHaveBeenCalled());
  },
};

export const SelectionMode: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // In selection mode each card is a role="checkbox"; clicking toggles it.
    const checkboxes = await c.findAllByRole('checkbox', { name: /Anime #/ });
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(checkboxes[0]);
    await waitFor(() => expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true'));
  },
};
