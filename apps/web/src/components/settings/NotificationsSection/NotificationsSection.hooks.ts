import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useMountedRef } from '@/hooks/useMountedRef';
import type { NotificationSettings } from '@shiroani/shared';
import type {
  INotifFormData,
  INotificationsSectionProps,
  INotificationsSectionView,
} from './NotificationsSection.types';

const defaultNotifData: INotifFormData = {
  enabled: false,
  leadTime: '15',
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  useSystemSound: true,
};

/** Save a partial update to the main process immediately */
function saveToMain(data: INotifFormData) {
  const settings: Partial<NotificationSettings> = {
    enabled: data.enabled,
    leadTimeMinutes: Number(data.leadTime),
    quietHours: {
      enabled: data.quietHoursEnabled,
      start: data.quietHoursStart,
      end: data.quietHoursEnd,
    },
    useSystemSound: data.useSystemSound,
  };
  const req = window.electronAPI?.notifications?.updateSettings(settings);
  void req?.catch(() => {});
}

export function useNotificationsSection(
  _props?: INotificationsSectionProps
): INotificationsSectionView {
  const { t } = useTranslation('settings');
  const [data, setData] = useState<INotifFormData>(defaultNotifData);
  const [loaded, setLoaded] = useState(false);
  const isMounted = useMountedRef();

  // Load settings from main process on mount
  useEffect(() => {
    const req = window.electronAPI?.notifications?.getSettings();
    if (!req) {
      setLoaded(true);
      return;
    }
    req
      .then(settings => {
        if (!isMounted() || !settings) return;
        setData({
          enabled: settings.enabled,
          leadTime: String(settings.leadTimeMinutes),
          quietHoursEnabled: settings.quietHours?.enabled ?? false,
          quietHoursStart: settings.quietHours?.start ?? '23:00',
          quietHoursEnd: settings.quietHours?.end ?? '07:00',
          useSystemSound: settings.useSystemSound ?? true,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted()) setLoaded(true);
      });
  }, [isMounted]);

  const updateAndSave = useCallback((partial: Partial<INotifFormData>) => {
    setData(prev => {
      const next = { ...prev, ...partial };
      // Schedule save outside the updater to avoid side effects in React Strict Mode
      queueMicrotask(() => saveToMain(next));
      return next;
    });
  }, []);

  const subscriptions = useNotificationStore(state => state.subscriptions);
  const loadSubscriptions = useNotificationStore(state => state.loadSubscriptions);
  const notifLoaded = useNotificationStore(state => state.loaded);
  const unsubscribe = useNotificationStore(state => state.unsubscribe);
  const toggleSubscription = useNotificationStore(state => state.toggleSubscription);

  // Load subscriptions
  useEffect(() => {
    if (!notifLoaded) loadSubscriptions();
  }, [notifLoaded, loadSubscriptions]);

  // Re-derive options on language change so the select labels update.
  const leadTimeOptions = useMemo(
    () => [
      { value: '0', label: t('notifications.leadTime.options.exact') },
      { value: '5', label: t('notifications.leadTime.options.min5') },
      { value: '15', label: t('notifications.leadTime.options.min15') },
      { value: '30', label: t('notifications.leadTime.options.min30') },
      { value: '60', label: t('notifications.leadTime.options.h1') },
    ],
    [t]
  );

  return {
    data,
    loaded,
    updateAndSave,
    subscriptions,
    unsubscribe,
    toggleSubscription,
    leadTimeOptions,
  };
}
