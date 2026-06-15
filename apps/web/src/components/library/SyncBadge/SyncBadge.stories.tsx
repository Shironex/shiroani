import type { Meta, StoryObj } from '@storybook/react-vite';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import SyncBadge from './SyncBadge';

/**
 * Tiny per-entry sync indicator (a cloud / cloud-off glyph) shown on cards and
 * list rows for AniList or MyAnimeList. It self-gates: renders nothing unless
 * the chosen provider is connected and the entry carries that provider's id.
 */
const meta = {
  title: 'library/SyncBadge',
  component: SyncBadge,
  parameters: {
    // role=img with an aria-label accessible name; no interactive elements.
    a11y: { test: 'error' },
  },
  argTypes: {
    provider: {
      description:
        "Which provider's sync state to reflect ('anilist' or 'mal'). Defaults to AniList.",
    },
    entry: {
      description: 'Entry carrying the provider id + last-synced timestamp fields the badge reads.',
    },
    className: {
      description: 'Extra classes for the badge wrapper (e.g. absolute positioning on a card).',
    },
    iconClassName: { description: 'Icon size class (default `w-3.5 h-3.5`).' },
  },
  beforeEach: () => {
    // Connect AniList so the badge has something to render.
    useAniListAuthStore.setState({ status: { connected: true } });
  },
} satisfies Meta<typeof SyncBadge>;

export default meta;

type Story = StoryObj<typeof SyncBadge>;

export const Synced: Story = {
  args: {
    provider: 'anilist',
    entry: { anilistId: 1, anilistSyncedAt: Date.now(), malId: null, malSyncedAt: null },
  },
};

export const NotSynced: Story = {
  args: {
    provider: 'anilist',
    entry: { anilistId: 1, anilistSyncedAt: null, malId: null, malSyncedAt: null },
  },
};
