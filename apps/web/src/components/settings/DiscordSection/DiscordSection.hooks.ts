import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { IDiscordSectionView } from './DiscordSection.types';

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

export function useDiscordSection(): IDiscordSectionView {
  const { i18n } = useTranslation('settings');
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

  // Auto-save model (matches every other settings section): persist the moment
  // a field changes and flash a transient "saved" indicator, instead of gating
  // the write behind an explicit Save button the rest of the surface doesn't have.
  const persist = useCallback(
    async (next: DiscordRpcSettings) => {
      await window.electronAPI?.discordRpc?.updateSettings(next);
      if (!isMounted()) return;
      setSaved(true);
      setTimeout(() => {
        if (isMounted()) setSaved(false);
      }, 1500);
    },
    [isMounted]
  );

  const updateField = useCallback(
    <K extends keyof DiscordRpcSettings>(key: K, value: DiscordRpcSettings[K]) => {
      setSettings(prev => {
        if (!prev) return prev;
        const next = { ...prev, [key]: value };
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const updateTemplate = useCallback(
    (type: DiscordActivityType, field: string, value: string | boolean) => {
      setSettings(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          templates: {
            ...prev.templates,
            [type]: { ...prev.templates[type], [field]: value },
          },
        };
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const handleResetTemplate = useCallback(() => {
    const translate = (key: string) => tDynamic(i18n, `settings:${key}`);
    setSettings(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        templates: {
          ...prev.templates,
          [selectedActivity]: resolveTemplate(
            DEFAULT_DISCORD_TEMPLATES[selectedActivity],
            translate
          ),
        },
      };
      void persist(next);
      return next;
    });
  }, [selectedActivity, i18n, persist]);

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

  const showCustomTemplateColumns = Boolean(
    settings && settings.enabled && settings.useCustomTemplates
  );

  return {
    settings,
    saved,
    selectedActivity,
    setSelectedActivity,
    status,
    updateField,
    updateTemplate,
    handleResetTemplate,
    currentTemplate,
    previewDetails,
    previewState,
    showCustomTemplateColumns,
  };
}
