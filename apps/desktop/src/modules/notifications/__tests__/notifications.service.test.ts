import { NotificationsService } from '../notifications.service';
import type { NotificationHostPort } from '../notification-host.port';
import type { NotificationStorePort } from '../notification-store.port';
import type { ScheduleService } from '../../schedule/schedule.service';
import type { LibraryService } from '../../library/library.service';

function build(supportsNative = true) {
  const host = {
    supportsNativeNotifications: jest.fn(() => supportsNative),
    showAiringNotification: jest.fn().mockResolvedValue(undefined),
    scheduleToastsOnQuit: jest.fn().mockResolvedValue(undefined),
    clearScheduledToasts: jest.fn().mockResolvedValue(undefined),
    logScheduledToastDiagnostics: jest.fn().mockResolvedValue(undefined),
  };
  const store = {
    loadSettings: jest.fn(() => ({ enabled: true })),
    saveSettings: jest.fn(),
    loadSentKeys: jest.fn(() => ['1:1']),
    saveSentKeys: jest.fn(),
    loadCachedSchedule: jest.fn(() => []),
    saveCachedSchedule: jest.fn(),
  };
  const library = { getAllEntries: jest.fn(() => []) };
  const service = new NotificationsService(
    {} as ScheduleService,
    library as unknown as LibraryService,
    host as unknown as NotificationHostPort,
    store as unknown as NotificationStorePort
  );
  return { service, host, store, library };
}

describe('NotificationsService.shutdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('schedules toasts and saves sent keys once, reading the library before returning', async () => {
    const { service, host, store, library } = build();
    service.initialize();
    store.saveSentKeys.mockClear();

    await service.shutdown();

    expect(library.getAllEntries).toHaveBeenCalledWith('watching');
    expect(host.scheduleToastsOnQuit).toHaveBeenCalledTimes(1);
    expect(store.saveSentKeys).toHaveBeenCalledTimes(1);
    expect(store.saveSentKeys).toHaveBeenCalledWith(['1:1']);
  });

  it('does nothing on a second call', async () => {
    const { service, host, store } = build();
    service.initialize();
    await service.shutdown();
    store.saveSentKeys.mockClear();

    await service.shutdown();

    expect(host.scheduleToastsOnQuit).toHaveBeenCalledTimes(1);
    expect(store.saveSentKeys).not.toHaveBeenCalled();
  });

  it('keeps persisted sent keys when quitting before initialize ran', async () => {
    const { service, host, store } = build();

    await service.shutdown();

    expect(store.saveSentKeys).not.toHaveBeenCalled();
    expect(host.scheduleToastsOnQuit).not.toHaveBeenCalled();
  });

  it('stops timers started by a settings change before initialize ran', async () => {
    const { service } = build();
    service.updateNotificationSettings({ enabled: true });
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    await service.shutdown();

    expect(jest.getTimerCount()).toBe(0);
  });
});
