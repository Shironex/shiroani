import { Trans, useTranslation } from 'react-i18next';
import { Bell, X, BellRing, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  SettingsCard,
  SettingsInfoCallout,
  SettingsSectionSkeleton,
  SettingsSelectRow,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { IS_WINDOWS } from '@/lib/platform';
import { useNotificationsSection } from './NotificationsSection.hooks';
import type { INotificationsSectionProps } from './NotificationsSection.types';

export default function NotificationsSection(props: INotificationsSectionProps) {
  const { t } = useTranslation('settings');
  const {
    data,
    loaded,
    updateAndSave,
    subscriptions,
    unsubscribe,
    toggleSubscription,
    leadTimeOptions,
  } = useNotificationsSection(props);

  if (!loaded) return <SettingsSectionSkeleton cards={2} />;

  const showWindowsInfo = IS_WINDOWS && data.enabled;
  const showQuietHourInputs = data.quietHoursEnabled && data.enabled;

  const subscriptionRows = subscriptions.map(sub => {
    const showRomaji = Boolean(sub.titleRomaji && sub.titleRomaji !== sub.title);
    return (
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
          {showRomaji && (
            <p className="text-2xs text-muted-foreground/80 truncate">{sub.titleRomaji}</p>
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
    );
  });

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

        {showQuietHourInputs && (
          <div className="flex items-center gap-3 pl-0">
            <div className="flex items-center gap-1.5">
              <label htmlFor="quiet-start" className="text-[11.5px] text-muted-foreground">
                {t('notifications.quietHours.from')}
              </label>
              <Input
                id="quiet-start"
                type="time"
                value={data.quietHoursStart}
                onChange={e => updateAndSave({ quietHoursStart: e.target.value })}
                className="h-8 w-auto text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="quiet-end" className="text-[11.5px] text-muted-foreground">
                {t('notifications.quietHours.to')}
              </label>
              <Input
                id="quiet-end"
                type="time"
                value={data.quietHoursEnd}
                onChange={e => updateAndSave({ quietHoursEnd: e.target.value })}
                className="h-8 w-auto text-xs"
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
      {showWindowsInfo && (
        <SettingsInfoCallout
          icon={Info}
          iconClassName="w-4 h-4 text-muted-foreground/80 mt-0.5 shrink-0"
        >
          <Trans
            i18nKey="notifications.windowsInfo"
            ns="settings"
            components={{ 1: <b className="font-semibold text-foreground" /> }}
          />
        </SettingsInfoCallout>
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
          <div className="space-y-2">{subscriptionRows}</div>
        )}
      </SettingsCard>
    </div>
  );
}
