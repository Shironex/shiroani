import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { useAniListSyncStore } from '@/stores/useAniListSyncStore';
import { useMalSyncStore } from '@/stores/useMalSyncStore';
import AccountsSection from './AccountsSection';

const anilistViewer = { id: 7, name: 'Anya' };
const malViewer = { id: 9, name: 'Loid' };

/**
 * Both account cards call `fetchStatus()` on mount, and the connect/disconnect
 * buttons drive the auth stores. In Storybook there is no `window.electronAPI`
 * bridge, so seed both auth stores to a deterministic state and stub their
 * async actions to no-op `fn()`s — that keeps every story socket-free and lets
 * play tests assert the stubbed actions fired without touching the dead test
 * backend. When a card is shown connected the matching sync store is seeded and
 * its socket-touching `sync`/`pushLibrary` are stubbed too, so the inline sync
 * card never opens a connection.
 */
function stubAuthStores() {
  useAniListAuthStore.setState({
    fetchStatus: fn().mockResolvedValue(undefined),
    connect: fn().mockResolvedValue(undefined),
    disconnect: fn().mockResolvedValue(undefined),
  });
  useMalAuthStore.setState({
    fetchStatus: fn().mockResolvedValue(undefined),
    connect: fn().mockResolvedValue(undefined),
    disconnect: fn().mockResolvedValue(undefined),
  });
}

/** Seed both sync stores to an idle, never-synced state with stubbed thunks. */
function stubSyncStores() {
  const idle = {
    syncing: false,
    entrySyncingId: null,
    progress: null,
    result: null,
    lastSyncedAt: null,
    error: null,
    sync: fn().mockResolvedValue(undefined),
    pushLibrary: fn().mockResolvedValue(undefined),
  };
  useAniListSyncStore.setState(idle);
  useMalSyncStore.setState(idle);
}

/**
 * Connected-accounts panel for the external integrations (AniList + MAL OAuth).
 * Each card reads its own auth store: disconnected cards show a Connect button,
 * connected cards show the viewer name, an expiry hint, a Disconnect button and
 * the inline two-way sync card. Tokens are held main-side and never cross IPC.
 * Every story seeds the auth (and, when connected, sync) stores in `beforeEach`
 * and stubs their async actions so nothing reaches the socket.
 */
const meta = {
  title: 'settings/AccountsSection',
  component: AccountsSection,
  parameters: {
    layout: 'padded',
    // Connect/Disconnect buttons are named, the avatar img is decorative
    // (empty alt), and the sync controls carry accessible names — axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof AccountsSection>;

export default meta;

type Story = StoryObj<typeof AccountsSection>;

/** Both providers disconnected — each card shows its Connect button. */
export const Disconnected: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    useMalAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    stubAuthStores();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const connectAniList = canvas.getByRole('button', { name: 'Connect AniList' });
    const connectMal = canvas.getByRole('button', { name: 'Connect MyAnimeList' });
    await expect(connectAniList).toBeInTheDocument();
    await expect(connectMal).toBeInTheDocument();

    // Clicking Connect drives the matching auth store.
    await userEvent.click(connectAniList);
    await expect(useAniListAuthStore.getState().connect).toHaveBeenCalled();
    await userEvent.click(connectMal);
    await expect(useMalAuthStore.getState().connect).toHaveBeenCalled();
  },
};

/** AniList connected — viewer name, expiry hint, Disconnect + sync card. */
export const AniListConnected: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({
      status: { connected: true, viewer: anilistViewer, expiresAt: 1_900_000_000_000 },
      loading: false,
      error: null,
    });
    useMalAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    stubAuthStores();
    stubSyncStores();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Connected as Anya')).toBeInTheDocument();
    // The sync card renders only when connected.
    await expect(canvas.getByRole('radiogroup', { name: 'Sync direction' })).toBeInTheDocument();

    // Disconnect drives the auth store's disconnect action.
    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }));
    await expect(useAniListAuthStore.getState().disconnect).toHaveBeenCalled();
  },
};

/** MyAnimeList connected — viewer name + its own sync card. */
export const MalConnected: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    useMalAuthStore.setState({
      status: { connected: true, viewer: malViewer, expiresAt: 1_900_000_000_000 },
      loading: false,
      error: null,
    });
    stubAuthStores();
    stubSyncStores();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Connected as Loid')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }));
    await expect(useMalAuthStore.getState().disconnect).toHaveBeenCalled();
  },
};

/** AniList connect failed — the store error resolves into the inline callout. */
export const WithError: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({
      status: { connected: false },
      loading: false,
      error: 'accounts:anilist.connectError',
    });
    useMalAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    stubAuthStores();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Could not connect to AniList. Please try again.')
    ).toBeInTheDocument();
  },
};

/**
 * Opening the AniList push dialog from the connected sync card, then cancelling
 * it. The dialog is closed before the play function ends so the underlying
 * controls are not left behind an open AlertDialog when the post-play a11y
 * check runs.
 */
export const PushLibraryFlow: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({
      status: { connected: true, viewer: anilistViewer },
      loading: false,
      error: null,
    });
    useMalAuthStore.setState({ status: { connected: false }, loading: false, error: null });
    stubAuthStores();
    stubSyncStores();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Push library…' }));

    // The AlertDialog portals to document.body.
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('alertdialog');
    await expect(dialog).toBeInTheDocument();

    // Cancel closes the dialog so the sync controls aren't aria-hidden when axe
    // runs after play.
    await userEvent.click(await body.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  },
};
