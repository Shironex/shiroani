import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { render, screen, waitFor } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { NotificationsSection } from '.';

function makeSubscription(overrides?: Partial<NotificationSubscription>): NotificationSubscription {
  return {
    anilistId: 1,
    title: 'Frieren',
    titleRomaji: 'Sousou no Frieren',
    coverImage: 'https://example.test/cover.jpg',
    subscribedAt: '2026-01-01T00:00:00.000Z',
    enabled: true,
    source: 'schedule',
    ...overrides,
  };
}

/**
 * The hook reads settings from the electron bridge on mount. The stub returns
 * the supplied settings so the section hydrates them deterministically and
 * exposes the `updateSettings` spy so callers can assert the persisted shape.
 */
function setBridge(settings?: Partial<NotificationSettings>) {
  const updateSettings = vi.fn(async () => {});
  (window as unknown as { electronAPI?: unknown }).electronAPI = {
    notifications: {
      getSettings: vi.fn(async () => ({
        enabled: true,
        leadTimeMinutes: 15,
        quietHours: { enabled: false, start: '23:00', end: '07:00' },
        useSystemSound: true,
        ...settings,
      })),
      updateSettings,
    },
  };
  return { updateSettings };
}

describe('NotificationsSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useNotificationStore.setState({
      subscriptions: [],
      subscribedIds: new Set(),
      loaded: true,
    });
  });

  afterEach(() => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    vi.restoreAllMocks();
  });

  it('renders without throwing when no electron API is present', () => {
    // Without window.electronAPI.notifications.getSettings, the hook marks the
    // section loaded synchronously, so the cards render in the test environment.
    expect(() => render(<NotificationsSection />)).not.toThrow();
  });

  it('reflects the enabled flag on the episode-notifications switch', async () => {
    setBridge({ enabled: true });
    render(<NotificationsSection />);
    const toggle = await screen.findByRole('switch', { name: /Episode notifications/i });
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it('toggling episode notifications persists the new value to the bridge', async () => {
    const { updateSettings } = setBridge({ enabled: false });
    const { user } = render(<NotificationsSection />);
    const toggle = await screen.findByRole('switch', { name: /Episode notifications/i });
    await waitFor(() => expect(toggle).not.toBeChecked());
    await user.click(toggle);
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    );
  });

  it('disables the lead-time, quiet-hours and sound controls when disabled', async () => {
    setBridge({ enabled: false });
    render(<NotificationsSection />);
    await screen.findByRole('switch', { name: /Episode notifications/i });
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('switch', { name: /Quiet hours/i })).toBeDisabled();
    expect(screen.getByRole('switch', { name: /System sound/i })).toBeDisabled();
  });

  it('shows the quiet-hours time inputs only when quiet hours are enabled', async () => {
    setBridge({ enabled: true, quietHours: { enabled: true, start: '22:00', end: '06:00' } });
    render(<NotificationsSection />);
    await screen.findByRole('switch', { name: /Quiet hours/i });
    expect(screen.getByLabelText('From')).toHaveValue('22:00');
    expect(screen.getByLabelText('To')).toHaveValue('06:00');
  });

  it('hides the quiet-hours time inputs when quiet hours are off', async () => {
    setBridge({ enabled: true, quietHours: { enabled: false, start: '22:00', end: '06:00' } });
    render(<NotificationsSection />);
    await screen.findByRole('switch', { name: /Quiet hours/i });
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('To')).not.toBeInTheDocument();
  });

  it('editing a quiet-hours time persists the new value', async () => {
    const { updateSettings } = setBridge({
      enabled: true,
      quietHours: { enabled: true, start: '22:00', end: '06:00' },
    });
    const { user } = render(<NotificationsSection />);
    const from = await screen.findByLabelText('From');
    await user.clear(from);
    await user.type(from, '21:30');
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ quietHours: expect.objectContaining({ start: '21:30' }) })
      )
    );
  });

  it('shows the empty-state copy when there are no subscriptions', async () => {
    setBridge();
    render(<NotificationsSection />);
    expect(
      await screen.findByText(/No subscriptions\. Add an anime from the schedule/i)
    ).toBeInTheDocument();
  });

  it('renders a row per subscription with a toggle and remove button', async () => {
    useNotificationStore.setState({
      subscriptions: [makeSubscription({ anilistId: 1, title: 'Frieren' })],
      subscribedIds: new Set([1]),
      loaded: true,
    });
    setBridge();
    render(<NotificationsSection />);
    expect(await screen.findByText('Frieren')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Frieren' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove subscription' })).toBeInTheDocument();
  });

  it('toggling a subscription row calls the store toggle action', async () => {
    const toggleSubscription = vi.fn(async () => {});
    useNotificationStore.setState({
      subscriptions: [makeSubscription({ anilistId: 7, title: 'Bocchi' })],
      subscribedIds: new Set([7]),
      loaded: true,
      toggleSubscription,
    });
    setBridge();
    const { user } = render(<NotificationsSection />);
    await user.click(await screen.findByRole('switch', { name: 'Bocchi' }));
    expect(toggleSubscription).toHaveBeenCalledWith(7);
  });

  it('removing a subscription row calls the store unsubscribe action', async () => {
    const unsubscribe = vi.fn(async () => {});
    useNotificationStore.setState({
      subscriptions: [makeSubscription({ anilistId: 7, title: 'Bocchi' })],
      subscribedIds: new Set([7]),
      loaded: true,
      unsubscribe,
    });
    setBridge();
    const { user } = render(<NotificationsSection />);
    await screen.findByText('Bocchi');
    await user.click(screen.getByRole('button', { name: 'Remove subscription' }));
    expect(unsubscribe).toHaveBeenCalledWith(7);
  });
});
