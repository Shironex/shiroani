import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import ProfileView from './ProfileView';

/**
 * Top-level Profile view — the editorial header (title + per-tab actions + a
 * tablist) over a state-switched body (setup / skeleton / dashboard, plus the
 * always-present "In app" tab).
 *
 * Outside Electron the auth + MAL bridges are absent, so bootstrap resolves to
 * the DISCONNECTED state and the body falls through to the AniList connect form;
 * the AniList sync, profile-refresh interval and bridges are all bridge-gated
 * (never the socket), and the In-app tab's poll no-ops, so stories stay
 * socket-free. The MAL tab only appears with a connected MAL account, so the
 * tablist shows AniList + In app here.
 */
const meta = {
  title: 'profile/ProfileView',
  component: ProfileView,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useProfileStore.setState({
      username: '',
      profile: null,
      mode: null,
      isLoading: false,
      error: null,
    });
    useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
    useAppStatsStore.setState({ snapshot: mockAppStatsSnapshot });
  },
} satisfies Meta<typeof ProfileView>;

export default meta;

type Story = StoryObj<typeof ProfileView>;

/** Disconnected — header renders and the body settles on the connect form. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'My profile' })).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.getByText('Connect your AniList profile')).toBeInTheDocument()
    );
  },
};

/**
 * Switching to the "In app" tab swaps the body to the local stats panel; the
 * tablist roles drive the keyboard/selection contract.
 */
export const SwitchToAppTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const appTab = canvas.getByRole('tab', { name: 'In app' });
    await userEvent.click(appTab);
    await waitFor(() => expect(appTab).toHaveAttribute('aria-selected', 'true'));
    // The In-app stats panel body is now shown.
    await expect(canvas.getByText('Your time with ShiroAni')).toBeInTheDocument();

    // Switching back to the AniList tab restores the connect form body.
    const aniListTab = canvas.getByRole('tab', { name: 'From AniList' });
    await userEvent.click(aniListTab);
    await waitFor(() => expect(aniListTab).toHaveAttribute('aria-selected', 'true'));
    await expect(canvas.getByText('Connect your AniList profile')).toBeInTheDocument();
  },
};
