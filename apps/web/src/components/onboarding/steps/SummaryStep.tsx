import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Languages,
  Palette,
  Sparkles,
  LayoutGrid,
  MessageCircle,
  Shield,
  Library,
  BookMarked,
  PartyPopper,
} from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { isSupportedLanguage } from '@shiroani/shared';
import { getThemeOption } from '@/lib/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useDockStore } from '@/stores/useDockStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';

/**
 * Step 07 · Summary.
 *
 * Read-only confirmation screen — reflects every store the wizard touched.
 * Discord RPC state lives in main-process electron-store, so it's loaded via
 * `electronAPI.discordRpc.getSettings()` rather than a renderer store. The
 * "Zaczynamy!" CTA lives in the wizard chrome (wired to `onComplete`).
 */
const UNKNOWN = '—';

export function SummaryStep() {
  const { t, i18n } = useTranslation('onboarding');
  const theme = useSettingsStore(s => s.theme);
  const customThemes = useCustomThemeStore(s => s.customThemes);
  const customBackground = useBackgroundStore(s => s.customBackground);
  const backgroundBlur = useBackgroundStore(s => s.backgroundBlur);
  const edge = useDockStore(s => s.edge);
  const autoHide = useDockStore(s => s.autoHide);
  const adblockEnabled = useBrowserStore(s => s.adblockEnabled);

  // Account connection state (mirrors AniListStep / MalStep). Fetched on mount so
  // the summary is correct even when the user jumps straight here (Esc → summary)
  // without visiting the account steps. Both fetches are idempotent + safe in web
  // preview (they resolve to "not connected").
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
  // (web preview / pre-IPC-ready), in which case the row renders "—".
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
        // Electron API unavailable — leave as null so the row falls back to "—"
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const languageValue = useMemo(() => {
    const lng = i18n.language;
    if (!isSupportedLanguage(lng)) return UNKNOWN;
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
      ? UNKNOWN
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

  const emPrimary = <em className="not-italic text-primary italic" />;
  const bStrong = <b className="font-semibold text-foreground" />;
  const bPrimary = <b className="font-bold text-primary" />;

  return (
    <StepLayout
      kanji="完"
      headline={
        <Trans ns="onboarding" i18nKey="step.summary.headline" components={{ 1: emPrimary }} />
      }
      description={
        <Trans ns="onboarding" i18nKey="step.summary.description" components={{ 1: bStrong }} />
      }
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.summary.marker" components={{ 1: bPrimary }} />
      }
      stepTitle={t('step.summary.title')}
      stepIcon={
        <span
          className="grid h-10 w-10 place-items-center rounded-full border border-primary/35 bg-primary/15 text-primary animate-[splash-bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-hidden="true"
        >
          <PartyPopper className="h-5 w-5" />
        </span>
      }
    >
      <p className="max-w-[34ch] text-[13px] leading-relaxed text-muted-foreground">
        {t('step.summary.intro')}
      </p>

      <div className="flex flex-col gap-2">
        <SummaryRow
          icon={<Languages className="h-4 w-4" />}
          label={t('step.summary.row.language')}
          value={languageValue}
        />
        <SummaryRow
          icon={<Palette className="h-4 w-4" />}
          label={t('step.summary.row.theme')}
          value={themeLabel}
        />
        <SummaryRow
          icon={<Sparkles className="h-4 w-4" />}
          label={t('step.summary.row.background')}
          value={backgroundLabel}
        />
        <SummaryRow
          icon={<LayoutGrid className="h-4 w-4" />}
          label={t('step.summary.row.dock')}
          value={dockLabel}
        />
        <SummaryRow
          icon={<MessageCircle className="h-4 w-4" />}
          label={t('step.summary.row.discord')}
          value={discordValue}
          highlight={discordEnabled === true}
        />
        <SummaryRow
          icon={<Library className="h-4 w-4" />}
          label={t('step.summary.row.anilist')}
          value={anilistValue}
          highlight={anilistStatus.connected}
        />
        <SummaryRow
          icon={<BookMarked className="h-4 w-4" />}
          label={t('step.summary.row.mal')}
          value={malValue}
          highlight={malStatus.connected}
        />
        <SummaryRow
          icon={<Shield className="h-4 w-4" />}
          label={t('step.summary.row.adblock')}
          value={adblockEnabled ? t('step.summary.value.on') : t('step.summary.value.off')}
          highlight={adblockEnabled}
        />
      </div>
    </StepLayout>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-glass bg-foreground/[0.02] px-3 py-2.5 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span
        className={
          'font-mono text-[10.5px] font-semibold tracking-[0.05em] ' +
          (highlight ? 'text-primary' : 'text-foreground')
        }
      >
        {value}
      </span>
    </div>
  );
}
