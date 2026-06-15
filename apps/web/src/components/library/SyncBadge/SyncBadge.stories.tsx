import type { Meta, StoryObj } from '@storybook/react-vite';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import SyncBadge from './SyncBadge';

const meta = {
  title: 'library/SyncBadge',
  component: SyncBadge,
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
