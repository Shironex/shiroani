import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { useNotificationStore } from '@/stores/useNotificationStore';
import NotificationsSection from './NotificationsSection';

const subscription: NotificationSubscription = {
  anilistId: 1,
  title: 'Frieren',
  titleRomaji: 'Sousou no Frieren',
  coverImage: '',
  subscribedAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  source: 'schedule',
};

/**
 * Installs a fake Electron bridge on `window` so the hook hydrates notification
 * settings over IPC and renders. `updateSettings` is a `fn()` spy stories assert
 * against. The subscriptions store is pre-seeded as loaded so its mount effect
 * never fires `loadSubscriptions` (which would touch the bridge).
 */
function stubNotificationsBridge(
  settings?: Partial<NotificationSettings>,
  subscriptions: NotificationSubscription[] = []
) {
  const win = window as unknown as { electronAPI?: unknown };
  const prev = win.electronAPI;
  const updateSettings = fn(async () => {}).mockName('updateSettings');
  win.electronAPI = {
    notifications: {
      getSettings: async () => ({
        enabled: true,
        leadTimeMinutes: 15,
        quietHours: { enabled: false, start: '23:00', end: '07:00' },
        useSystemSound: true,
        ...settings,
      }),
      updateSettings,
    },
  };
  useNotificationStore.setState({
    subscriptions,
    subscribedIds: new Set(subscriptions.map(s => s.anilistId)),
    loaded: true,
  });
  return { updateSettings, restore: () => void (win.electronAPI = prev) };
}

/**
 * Notification settings surface — an episode-notifications toggle plus a
 * lead-time Select, a quiet-hours toggle (which reveals from/to time inputs),
 * and a system-sound toggle. All controls except the master toggle disable when
 * notifications are off. A second card lists the user's per-anime subscriptions
 * (each with its own toggle + remove button) or an empty-state hint.
 */
const meta = {
  title: 'settings/NotificationsSection',
  component: NotificationsSection,
  parameters: {
    layout: 'padded',
    // SettingsCard rows wire aria-labelledby, the quiet-hours inputs have bound
    // labels, and subscription controls carry accessible names — axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof NotificationsSection>;

export default meta;

type Story = StoryObj<typeof NotificationsSection>;

/** Enabled with no subscriptions — toggling quiet hours reveals the time inputs. */
export const Enabled: Story = {
  beforeEach: () => {
    const { restore } = stubNotificationsBridge({ enabled: true });
    return restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const master = await canvas.findByRole('switch', { name: /Episode notifications/i });
    await expect(master).toBeChecked();
    // The empty-state hint stands in for the subscriptions list.
    await expect(
      canvas.getByText(/No subscriptions\. Add an anime from the schedule/i)
    ).toBeInTheDocument();

    // Turning quiet hours on reveals the from/to time inputs.
    await userEvent.click(canvas.getByRole('switch', { name: /Quiet hours/i }));
    await waitFor(() => expect(canvas.getByLabelText('From')).toBeInTheDocument());
  },
};

/** Disabled — the dependent controls are non-interactive. */
export const Disabled: Story = {
  beforeEach: () => {
    const { restore } = stubNotificationsBridge({ enabled: false });
    return restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const master = await canvas.findByRole('switch', { name: /Episode notifications/i });
    await expect(master).not.toBeChecked();
    await expect(canvas.getByRole('combobox')).toBeDisabled();
    await expect(canvas.getByRole('switch', { name: /Quiet hours/i })).toBeDisabled();
  },
};

/** With a subscription — the row renders with its toggle and remove button. */
export const WithSubscription: Story = {
  beforeEach: () => {
    const { restore } = stubNotificationsBridge({ enabled: true }, [subscription]);
    return restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Frieren')).toBeInTheDocument();
    await expect(canvas.getByRole('switch', { name: 'Frieren' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Remove subscription' })).toBeInTheDocument();
  },
};
