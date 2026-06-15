import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { mockMalStats } from '../profile-fixtures';
import MalStatsPanel from './MalStatsPanel';

/**
 * "MyAnimeList" tab body — a sidebar (avatar + summary + sync status + open
 * action) beside a scrollable column of status rings, headline stats and a
 * time-invested breakdown. Fed by `useMalProfileStore`, which the panel fetches
 * on mount; stories seed the store and stub `fetchProfile` so no socket call
 * runs.
 */
const meta = {
  title: 'profile/MalStatsPanel',
  component: MalStatsPanel,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
} satisfies Meta<typeof MalStatsPanel>;

export default meta;

type Story = StoryObj<typeof MalStatsPanel>;

/** Connected viewer — full stat surface; the open-profile action navigates out. */
export const Connected: Story = {
  beforeEach: () => {
    useMalProfileStore.setState({
      profile: mockMalStats,
      isLoading: false,
      error: null,
      notConnected: false,
      fetchProfile: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('MyAnimeList · connected')).toBeInTheDocument();
    await expect(canvas.getByText('By status')).toBeInTheDocument();
    // 220 completed items in the headline grid.
    await expect(canvas.getByText('220')).toBeInTheDocument();

    // The open-profile action is named and reachable.
    const openProfile = canvas.getByRole('button', { name: 'Open on MAL' });
    await expect(openProfile).toBeEnabled();
    await userEvent.click(openProfile);
  },
};

/** Loading — no profile yet, fetch in flight; the shared skeleton shows. */
export const Loading: Story = {
  beforeEach: () => {
    useMalProfileStore.setState({
      profile: null,
      isLoading: true,
      error: null,
      notConnected: false,
      fetchProfile: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};

/** Settled not-connected — the empty state offers a retry instead of a skeleton. */
export const NotConnected: Story = {
  beforeEach: () => {
    useMalProfileStore.setState({
      profile: null,
      isLoading: false,
      error: null,
      notConnected: true,
      fetchProfile: fn(),
    });
    // The not-connected effect re-resolves auth status; stub it socket-free.
    useMalAuthStore.setState({ fetchStatus: fn().mockResolvedValue(undefined) });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('MyAnimeList not connected')).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByRole('button', { name: /retry/i })).toBeInTheDocument());
  },
};
