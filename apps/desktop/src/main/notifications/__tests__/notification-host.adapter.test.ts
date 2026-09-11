jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));
jest.mock('../notification-strings', () => ({
  resolveAnimeTitle: () => 'Test Anime',
  buildLocalizedNotificationBody: () => 'Odcinek 1 za 60 min',
}));
jest.mock('../win-scheduled-notifications', () => ({
  scheduleToastsOnQuit: jest.fn(async () => undefined),
  clearScheduledToasts: jest.fn(async () => undefined),
  logWindowsToastDiagnostics: jest.fn(async () => undefined),
}));

import { Notification } from 'electron';
import type { AiringAnime, NotificationSettings } from '@shiroani/shared';
import { ElectronNotificationHost } from '../notification-host.adapter';
import { DEFAULT_SETTINGS } from '../../../modules/notifications/notification-logic';

const REAL_PLATFORM = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

function makeAiring(): AiringAnime {
  return {
    id: 1,
    airingAt: Math.floor(Date.now() / 1000) + 3600,
    episode: 1,
    media: {
      id: 1,
      title: { romaji: 'Test Anime' },
      // no coverImage entries → the adapter skips the icon download entirely
      coverImage: {},
      status: 'RELEASING',
      genres: [],
    },
  };
}

const settings: NotificationSettings = { ...DEFAULT_SETTINGS, enabled: true };

afterAll(() => setPlatform(REAL_PLATFORM));

beforeEach(() => {
  (Notification as unknown as jest.Mock).mockClear();
});

/**
 * macOS is gated off because Electron 42+ routes notifications through
 * `UNNotification`, which silently refuses to display them for an ad-hoc-signed
 * app. See docs/migrations/2026-09-11-electron-41-to-44.md.
 */
describe('ElectronNotificationHost.supportsNativeNotifications', () => {
  it.each<[NodeJS.Platform, boolean]>([
    ['win32', true],
    ['linux', true],
    ['darwin', false],
  ])('returns %s → %s', (platform, expected) => {
    setPlatform(platform);
    expect(new ElectronNotificationHost().supportsNativeNotifications()).toBe(expected);
  });
});

describe('ElectronNotificationHost.showAiringNotification', () => {
  it('constructs and shows a notification on a supported platform', async () => {
    setPlatform('win32');
    await new ElectronNotificationHost().showAiringNotification(makeAiring(), settings);

    expect(Notification).toHaveBeenCalledTimes(1);
    const instance = (Notification as unknown as jest.Mock).mock.results[0].value;
    expect(instance.show).toHaveBeenCalledTimes(1);
  });

  it('registers a failed handler so a silent OS rejection is still logged', async () => {
    setPlatform('win32');
    await new ElectronNotificationHost().showAiringNotification(makeAiring(), settings);

    const instance = (Notification as unknown as jest.Mock).mock.results[0].value;
    const events = (instance.on as jest.Mock).mock.calls.map(([event]) => event);
    expect(events).toContain('failed');
  });

  it('is a no-op on macOS — never builds a Notification the OS would reject', async () => {
    setPlatform('darwin');
    await new ElectronNotificationHost().showAiringNotification(makeAiring(), settings);

    expect(Notification).not.toHaveBeenCalled();
  });
});
