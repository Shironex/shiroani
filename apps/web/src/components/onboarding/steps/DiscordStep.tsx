import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Check, MessageCircle } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { SettingsToggleRow } from '@/components/settings/SettingsCard';
import { IS_ELECTRON } from '@/lib/platform';
import { APP_LOGO_URL } from '@/lib/constants';

/**
 * Step 05 · Discord Rich Presence.
 *
 * Loads the current RPC settings, toggles the `enabled` flag, and previews
 * the Discord card inline. Falls back to a disabled/amber warning when
 * `window.electronAPI` isn't available (web/dev preview).
 */
export function DiscordStep() {
  const { t } = useTranslation('onboarding');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI?.discordRpc
      ?.getSettings()
      .then((s: { enabled?: boolean } | null) => {
        if (s && typeof s.enabled === 'boolean') setEnabled(s.enabled);
      })
      .catch(() => {
        // Electron API unavailable — degrade silently
      });
  }, []);

  const handleToggle = useCallback(async (value: boolean) => {
    setEnabled(value);
    setSaving(true);
    try {
      const current = await window.electronAPI?.discordRpc?.getSettings();
      if (current) {
        await window.electronAPI?.discordRpc?.updateSettings({ ...current, enabled: value });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Electron API unavailable or failed — degrade silently
    } finally {
      setSaving(false);
    }
  }, []);

  const emPrimary = <em className="not-italic text-primary italic" />;
  const bPrimary = <b className="font-bold text-primary" />;

  return (
    <StepLayout
      kanji="絆"
      headline={
        <Trans ns="onboarding" i18nKey="step.discord.headline" components={{ 1: emPrimary }} />
      }
      description={t('step.discord.description')}
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.discord.marker" components={{ 1: bPrimary }} />
      }
      stepIcon={<MessageCircle className="h-5 w-5" />}
      stepTitle={t('step.discord.title')}
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border-glass bg-foreground/[0.02] p-4">
        {!IS_ELECTRON && <p className="text-xs text-amber-500">{t('step.discord.desktopOnly')}</p>}

        <div className="border-b border-border-glass pb-3">
          <SettingsToggleRow
            id="onb-discord-label"
            title={t('step.discord.toggle.title')}
            description={t('step.discord.toggle.description')}
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving || !IS_ELECTRON}
          />
        </div>

        {/* Mock Discord card */}
        <div className="rounded-xl border border-white/5 bg-[oklch(0.18_0.022_260)] p-3.5 text-[oklch(0.96_0.01_260)]">
          <div className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.7_0.02_260)]">
            {enabled ? t('step.discord.preview.watching') : t('step.discord.preview.off')}
          </div>
          <div className="flex gap-2.5">
            <div
              className={
                'relative h-[54px] w-[54px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10' +
                (enabled ? '' : ' grayscale brightness-50')
              }
              style={{
                background: 'linear-gradient(150deg, oklch(0.45 0.17 350), oklch(0.32 0.12 30))',
              }}
            >
              <img
                src={APP_LOGO_URL}
                alt=""
                className="absolute inset-0 m-auto h-9 w-9 object-contain"
                draggable={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <b className="block text-[13px] font-bold">{t('step.discord.preview.appName')}</b>
              <p className="truncate text-[11.5px] text-[oklch(0.85_0.015_260)]">
                {enabled ? t('step.discord.preview.exampleTitle') : t('step.discord.preview.off')}
              </p>
              {enabled && (
                <small className="block font-mono text-[10px] text-[oklch(0.7_0.02_260)]">
                  {t('step.discord.preview.exampleEpisode')}
                </small>
              )}
            </div>
          </div>
        </div>

        {saved && (
          <p className="flex items-center gap-1 font-mono text-[10.5px] text-primary animate-fade-in">
            <Check className="h-3 w-3" />
            {t('step.discord.saved')}
          </p>
        )}
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.discord.footnote')}
      </p>
    </StepLayout>
  );
}
