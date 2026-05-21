import { useEffect, useState, useCallback, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Bell, X, BellRing, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  SettingsCard,
  SettingsSelectRow,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { IS_WINDOWS } from '@/lib/platform';
import { useMountedRef } from '@/hooks/useMountedRef';
import type { NotificationSettings } from '@shiroani/shared';

interface NotifFormData {
  enabled: boolean;
  leadTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  useSystemSound: boolean;
}

const defaultNotifData: NotifFormData = {
  enabled: false,
  leadTime: '15',
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  useSystemSound: true,
};

/** Save a partial update to the main process immediately */
function saveToMain(data: NotifFormData) {
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

export function NotificationsSection() {
  const { t } = useTranslation('settings');
  const [data, setData] = useState<NotifFormData>(defaultNotifData);
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

  const updateAndSave = useCallback((partial: Partial<NotifFormData>) => {
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

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Bell}
        title={t('notifications.card.title')}
        subtitle={t('notifications.card.subtitle')}
      >
        <SettingsToggleRow
          id="notif-enabled-label"
          title={t('notifications.enabled.title')}
          description={t('notifications.enabled.description')}
          checked={data.enabled}
          onCheckedChange={v => updateAndSave({ enabled: v })}
        />

        <SettingsSelectRow
          divider
          title={t('notifications.leadTime.title')}
          description={t('notifications.leadTime.description')}
          value={data.leadTime}
          onValueChange={v => updateAndSave({ leadTime: v })}
          disabled={!data.enabled}
          options={leadTimeOptions}
        />

        <SettingsToggleRow
          divider
          id="notif-quiet-label"
          title={t('notifications.quietHours.title')}
          description={t('notifications.quietHours.description')}
          checked={data.quietHoursEnabled}
          onCheckedChange={v => updateAndSave({ quietHoursEnabled: v })}
          disabled={!data.enabled}
        />

        {data.quietHoursEnabled && data.enabled && (
          <div className="flex items-center gap-3 pl-0">
            <div className="flex items-center gap-1.5">
              <label htmlFor="quiet-start" className="text-[11.5px] text-muted-foreground">
                {t('notifications.quietHours.from')}
              </label>
              <input
                id="quiet-start"
                type="time"
                value={data.quietHoursStart}
                onChange={e => updateAndSave({ quietHoursStart: e.target.value })}
                className="h-8 px-2 text-xs rounded-md border border-border-glass bg-background/40 focus:bg-background/60 transition-colors outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="quiet-end" className="text-[11.5px] text-muted-foreground">
                {t('notifications.quietHours.to')}
              </label>
              <input
                id="quiet-end"
                type="time"
                value={data.quietHoursEnd}
                onChange={e => updateAndSave({ quietHoursEnd: e.target.value })}
                className="h-8 px-2 text-xs rounded-md border border-border-glass bg-background/40 focus:bg-background/60 transition-colors outline-none"
              />
            </div>
          </div>
        )}

        <SettingsToggleRow
          divider
          id="notif-sound-label"
          title={t('notifications.useSystemSound.title')}
          description={t('notifications.useSystemSound.description')}
          checked={data.useSystemSound}
          onCheckedChange={v => updateAndSave({ useSystemSound: v })}
          disabled={!data.enabled}
        />
      </SettingsCard>

      {/* Windows scheduled notifications info */}
      {IS_WINDOWS && data.enabled && (
        <div className="flex items-start gap-3 rounded-xl border border-border-glass bg-background/40 px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
          <Info className="w-4 h-4 text-muted-foreground/80 mt-0.5 shrink-0" />
          <p>
            <Trans
              i18nKey="notifications.windowsInfo"
              ns="settings"
              components={{ 1: <b className="font-semibold text-foreground" /> }}
            />
          </p>
        </div>
      )}

      {/* Subscriptions list */}
      <SettingsCard
        icon={BellRing}
        title={t('notifications.subscriptions.title')}
        subtitle={t('notifications.subscriptions.subtitle')}
        tone="gold"
      >
        {subscriptions.length === 0 ? (
          <div className="rounded-lg border border-border-glass bg-background/30 px-4 py-3 text-center text-[12px] text-muted-foreground">
            {t('notifications.subscriptions.empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map(sub => (
              <div
                key={sub.anilistId}
                className="flex items-center gap-3 p-2 rounded-lg bg-background/40 border border-border-glass"
              >
                {sub.coverImage ? (
                  <img
                    src={sub.coverImage}
                    alt={sub.title}
                    className="w-8 h-11 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-11 rounded bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.title}</p>
                  {sub.titleRomaji && sub.titleRomaji !== sub.title && (
                    <p className="text-2xs text-muted-foreground/70 truncate">{sub.titleRomaji}</p>
                  )}
                </div>
                <Switch
                  checked={sub.enabled}
                  onCheckedChange={() => toggleSubscription(sub.anilistId)}
                  aria-label={sub.title}
                />
                <TooltipButton
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 shrink-0 text-muted-foreground hover:text-destructive"
                  tooltip={t('notifications.subscriptions.remove')}
                  onClick={() => unsubscribe(sub.anilistId)}
                >
                  <X className="w-3.5 h-3.5" />
                </TooltipButton>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
