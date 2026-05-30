import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  SettingsCard,
  SettingsInfoCallout,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { DiscordPreview } from '@/components/settings/DiscordPreview';
import { DiscordTemplateEditor } from '@/components/settings/DiscordTemplateEditor';
import { PillTag } from '@/components/ui/pill-tag';
import { substitutePreview } from '@/lib/discord-utils';
import { tDynamic } from '@/lib/i18n';
import { useMountedRef } from '@/hooks/useMountedRef';
import type {
  DiscordRpcSettings,
  DiscordActivityType,
  DiscordPresenceTemplate,
  DiscordPresenceTemplates,
  DiscordRpcStatus,
} from '@shiroani/shared';
import {
  DEFAULT_DISCORD_TEMPLATES,
  DISCORD_ACTIVITY_TYPES,
  resolveLocalizedTemplateField,
} from '@shiroani/shared';

/**
 * Convert a template that may still contain `@@i18n:<key>` sentinels (i.e. a
 * fresh default the user has never edited) into a fully resolved template
 * whose strings are in the active UI language. User-customised strings pass
 * through unchanged because they no longer carry the sentinel.
 *
 * Resolved here once at hydrate / reset time so the editor inputs show real
 * copy, and so persisting the settings stores resolved strings (not key
 * references) in electron-store. Subsequent runtime presence emission in main
 * reads those persisted strings directly.
 */
function resolveTemplate(
  template: DiscordPresenceTemplate,
  translate: (key: string) => string
): DiscordPresenceTemplate {
  return {
    ...template,
    details: resolveLocalizedTemplateField(template.details, translate),
    state: resolveLocalizedTemplateField(template.state, translate),
  };
}

function resolveTemplates(
  templates: DiscordPresenceTemplates,
  translate: (key: string) => string
): DiscordPresenceTemplates {
  const resolved = {} as DiscordPresenceTemplates;
  for (const type of DISCORD_ACTIVITY_TYPES) {
    resolved[type] = resolveTemplate(templates[type], translate);
  }
  return resolved;
}

/** Map each RPC connection status to a PillTag colour. */
const STATUS_VARIANT: Record<DiscordRpcStatus, 'green' | 'gold' | 'muted' | 'orange'> = {
  connected: 'green',
  connecting: 'gold',
  disconnected: 'muted',
  error: 'orange',
};

export function DiscordSection() {
  const { t, i18n } = useTranslation('settings');
  const [settings, setSettings] = useState<DiscordRpcSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<DiscordActivityType>('watching');
  const [status, setStatus] = useState<DiscordRpcStatus>('disconnected');
  const isMounted = useMountedRef();

  // Reflect the live RPC connection status so users can tell why presence is
  // (or isn't) showing. Seed from the current status, then subscribe to changes.
  useEffect(() => {
    window.electronAPI?.discordRpc?.getStatus().then(s => {
      if (isMounted() && s) setStatus(s);
    });
    return window.electronAPI?.discordRpc?.onStatusChanged(s => {
      if (isMounted()) setStatus(s);
    });
  }, [isMounted]);

  useEffect(() => {
    // Resolve sentinel-prefixed default fields the moment we hydrate so the
    // editor inputs show real copy in the active UI language. Saved user
    // overrides are passed through unchanged. The sentinels reference keys
    // inside the `settings` namespace, so we look them up there.
    const translate = (key: string) => tDynamic(i18n, `settings:${key}`);
    window.electronAPI?.discordRpc?.getSettings().then((s: DiscordRpcSettings) => {
      if (!isMounted()) return;
      if (s) {
        const merged: DiscordPresenceTemplates = s.templates
          ? { ...DEFAULT_DISCORD_TEMPLATES, ...s.templates }
          : { ...DEFAULT_DISCORD_TEMPLATES };
        setSettings({
          ...s,
          useCustomTemplates: s.useCustomTemplates ?? false,
          templates: resolveTemplates(merged, translate),
        });
      }
    });
  }, [i18n, isMounted]);

  const updateField = useCallback(
    <K extends keyof DiscordRpcSettings>(key: K, value: DiscordRpcSettings[K]) => {
      setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const updateTemplate = useCallback(
    (type: DiscordActivityType, field: string, value: string | boolean) => {
      setSettings(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          templates: {
            ...prev.templates,
            [type]: { ...prev.templates[type], [field]: value },
          },
        };
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!settings) return;
    await window.electronAPI?.discordRpc?.updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleResetTemplate = useCallback(() => {
    const translate = (key: string) => tDynamic(i18n, `settings:${key}`);
    setSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [selectedActivity]: resolveTemplate(
            DEFAULT_DISCORD_TEMPLATES[selectedActivity],
            translate
          ),
        },
      };
    });
  }, [selectedActivity, i18n]);

  const currentTemplate =
    settings?.templates?.[selectedActivity] ?? DEFAULT_DISCORD_TEMPLATES[selectedActivity];

  const previewDetails = useMemo(
    () => substitutePreview(currentTemplate.details, selectedActivity),
    [currentTemplate.details, selectedActivity]
  );
  const previewState = useMemo(
    () => substitutePreview(currentTemplate.state, selectedActivity),
    [currentTemplate.state, selectedActivity]
  );

  if (!settings) return null;

  const showCustomTemplateColumns = settings.enabled && settings.useCustomTemplates;

  const mainCard = (
    <SettingsCard
      icon={MessageCircle}
      title={t('discord.main.title')}
      subtitle={t('discord.main.subtitle')}
      headerAccessory={
        <div className="flex items-center gap-2">
          {settings.enabled && (
            <PillTag variant={STATUS_VARIANT[status]} aria-label={t('discord.status.aria')}>
              {t(`discord.status.${status}`)}
            </PillTag>
          )}
          <Switch
            aria-label={t('discord.main.enableAria')}
            checked={settings.enabled}
            onCheckedChange={v => updateField('enabled', v)}
          />
        </div>
      }
    >
      {!settings.useCustomTemplates && (
        <>
          <SettingsToggleRow
            id="discord-details-label"
            title={t('discord.main.showDetailsTitle')}
            description={t('discord.main.showDetailsDescription')}
            checked={settings.showAnimeDetails}
            onCheckedChange={v => updateField('showAnimeDetails', v)}
            disabled={!settings.enabled}
          />

          <SettingsToggleRow
            divider
            id="discord-time-label"
            title={t('discord.main.showTimeTitle')}
            description={t('discord.main.showTimeDescription')}
            checked={settings.showElapsedTime}
            onCheckedChange={v => updateField('showElapsedTime', v)}
            disabled={!settings.enabled}
          />
        </>
      )}

      <SettingsToggleRow
        divider={!settings.useCustomTemplates}
        id="discord-templates-label"
        title={t('discord.main.useTemplatesTitle')}
        description={t('discord.main.useTemplatesDescription')}
        checked={settings.useCustomTemplates}
        onCheckedChange={v => updateField('useCustomTemplates', v)}
        disabled={!settings.enabled}
      />

      <div>
        <Button size="sm" onClick={handleSave}>
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? t('discord.main.saved') : t('discord.main.save')}
        </Button>
      </div>
    </SettingsCard>
  );

  const previewCard = (
    <SettingsCard
      icon={MessageCircle}
      title={t('discord.preview.title')}
      subtitle={t('discord.preview.subtitle')}
      tone="blue"
    >
      <DiscordPreview
        details={previewDetails}
        state={previewState}
        showTimestamp={currentTemplate.showTimestamp}
        showLargeImage={currentTemplate.showLargeImage}
        showButton={currentTemplate.showButton}
        activityType={selectedActivity}
      />
    </SettingsCard>
  );

  const editorCard = (
    <DiscordTemplateEditor
      selectedActivity={selectedActivity}
      onActivityChange={setSelectedActivity}
      currentTemplate={currentTemplate}
      onTemplateChange={updateTemplate}
      onReset={handleResetTemplate}
    />
  );

  const infoCallout = (
    <SettingsInfoCallout
      icon={Info}
      iconClassName="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80"
    >
      {t('discord.info')}
    </SettingsInfoCallout>
  );

  if (showCustomTemplateColumns) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            {mainCard}
            {previewCard}
          </div>
          <div className="space-y-4">{editorCard}</div>
        </div>
        {infoCallout}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mainCard}
      {infoCallout}
    </div>
  );
}
