import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSupportedLanguage } from '@shiroani/shared';
import { getThemeOption } from '@/lib/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useDockStore } from '@/stores/useDockStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import type { ISummaryStepView } from './SummaryStep.types';

/**
 * Reflects every store the wizard touched into ready-to-render row values.
 * Discord RPC state lives in main-process electron-store (loaded over IPC, not a
 * renderer store); account state is fetched on mount so the summary is correct
 * even when the user jumps straight here (Esc → summary). Both fetches are
 * idempotent + safe in web preview (they resolve to "not connected").
 */
export function useSummaryStep(): ISummaryStepView {
  const { t, i18n } = useTranslation('onboarding');
  const theme = useSettingsStore(s => s.theme);
  const customThemes = useCustomThemeStore(s => s.customThemes);
  const customBackground = useBackgroundStore(s => s.customBackground);
  const backgroundBlur = useBackgroundStore(s => s.backgroundBlur);
  const edge = useDockStore(s => s.edge);
  const autoHide = useDockStore(s => s.autoHide);
  const adblockEnabled = useBrowserStore(s => s.adblockEnabled);

  const anilistStatus = useAniListAuthStore(s => s.status);
  const fetchAniListStatus = useAniListAuthStore(s => s.fetchStatus);
  const malStatus = useMalAuthStore(s => s.status);
  const fetchMalStatus = useMalAuthStore(s => s.fetchStatus);
  useEffect(() => {
    void fetchAniListStatus();
    void fetchMalStatus();
  }, [fetchAniListStatus, fetchMalStatus]);

  // Discord RPC state lives in main-process electron-store; mirror DiscordStep's
  // load pattern. Stays `null` until the IPC settles or when the API is missing
  // (web preview / pre-IPC-ready), in which case the row renders "Not set".
  const [discordEnabled, setDiscordEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    window.electronAPI?.discordRpc
      ?.getSettings()
      .then((s: { enabled?: boolean } | null) => {
        if (cancelled) return;
        if (s && typeof s.enabled === 'boolean') setDiscordEnabled(s.enabled);
      })
      .catch(() => {
        // Electron API unavailable — leave as null so the row falls back to "Not set"
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const languageValue = useMemo(() => {
    const lng = i18n.language;
    if (!isSupportedLanguage(lng)) return t('step.summary.value.notSet');
    return t(`step.summary.languages.${lng}`);
  }, [i18n.language, t]);

  const themeLabel = useMemo(() => {
    const opt = getThemeOption(theme, customThemes);
    return opt?.label ?? theme;
  }, [theme, customThemes]);

  const backgroundLabel = customBackground
    ? t('step.summary.background.custom', { percent: Math.round((backgroundBlur / 20) * 100) })
    : t('step.summary.background.none');

  const dockLabel = useMemo(() => {
    const edgeName = t(`step.summary.dock.edge.${edge}`);
    return autoHide ? t('step.summary.dock.autoHide', { edge: edgeName }) : edgeName;
  }, [edge, autoHide, t]);

  const discordValue =
    discordEnabled === null
      ? t('step.summary.value.notSet')
      : discordEnabled
        ? t('step.summary.value.on')
        : t('step.summary.value.off');

  // Connected → show the account name; otherwise a neutral "not connected".
  const anilistValue =
    anilistStatus.connected && anilistStatus.viewer
      ? anilistStatus.viewer.name
      : t('step.summary.value.notConnected');
  const malValue =
    malStatus.connected && malStatus.viewer
      ? malStatus.viewer.name
      : t('step.summary.value.notConnected');

  return {
    languageValue,
    themeLabel,
    backgroundLabel,
    dockLabel,
    discordValue,
    discordHighlight: discordEnabled === true,
    anilistValue,
    anilistHighlight: anilistStatus.connected,
    malValue,
    malHighlight: malStatus.connected,
    adblockValue: adblockEnabled ? t('step.summary.value.on') : t('step.summary.value.off'),
    adblockHighlight: adblockEnabled,
  };
}
