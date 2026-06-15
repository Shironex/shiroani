import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { useUpdateStore } from '@/stores/useUpdateStore';
import UpdatesSection from './UpdatesSection';

/**
 * The full updates panel: the current version hero, the update-status pill, the
 * Stable/Beta channel toggle, and the check / download / install actions. Reads
 * `useUpdateStore` (electron-store/IPC-backed, not socket-based); each story
 * seeds the store and stubs its async actions to no-ops so nothing reaches the
 * absent desktop bridge.
 */
function seedStore(overrides: Partial<ReturnType<typeof useUpdateStore.getState>> = {}) {
  useUpdateStore.setState({
    status: 'idle',
    updateInfo: null,
    progress: null,
    error: null,
    channel: 'stable',
    isChannelSwitching: false,
    lastCheckedAt: null,
    checkForUpdates: fn(),
    startDownload: fn(),
    installNow: fn(),
    setChannel: fn(),
    initListeners: fn().mockReturnValue(() => {}),
    ...overrides,
  });
}

const meta = {
  title: 'settings/updates/UpdatesSection',
  component: UpdatesSection,
  parameters: {
    // The status pill text, channel buttons and action buttons all carry
    // accessible names, so axe passes clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof UpdatesSection>;

export default meta;

type Story = StoryObj<typeof UpdatesSection>;

/** Idle — up to date, ready to check again. */
export const Idle: Story = {
  beforeEach: () => seedStore(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('App version')).toBeInTheDocument();
    // The idle status pill renders the "no new updates" label.
    await expect(canvas.getByText('No new updates')).toBeInTheDocument();
  },
};

/** Clicking "Check for updates" runs the store action. */
export const CheckForUpdates: Story = {
  beforeEach: () => seedStore(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Check for updates' });
    await userEvent.click(button);
    await waitFor(() => expect(useUpdateStore.getState().checkForUpdates).toHaveBeenCalledOnce());
  },
};

/** Switching to the Beta channel runs setChannel with the channel id. */
export const SwitchChannel: Story = {
  beforeEach: () => seedStore(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const beta = canvas.getByRole('button', { name: /Beta/ });
    await userEvent.click(beta);
    await waitFor(() => expect(useUpdateStore.getState().setChannel).toHaveBeenCalledWith('beta'));
  },
};

/** An update is available — the download action appears. */
export const UpdateAvailable: Story = {
  beforeEach: () =>
    seedStore({
      status: 'available',
      updateInfo: { version: '2.0.0', releaseNotes: null, releaseDate: '2026-01-01' },
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  },
};
