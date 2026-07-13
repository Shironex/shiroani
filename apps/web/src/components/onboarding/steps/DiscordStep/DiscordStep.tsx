import { Trans, useTranslation } from 'react-i18next';
import { Check, MessageCircle } from 'lucide-react';
import { SettingsToggleRow } from '@/components/settings/SettingsCard';
import { IS_ELECTRON } from '@/lib/platform';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bPrimary } from '../../shared-parts';
import { useDiscordStep } from './DiscordStep.hooks';
import { DiscordPreviewCard } from './DiscordStep.parts';

/**
 * Step 05 · Discord Rich Presence.
 *
 * Loads the current RPC settings, toggles the `enabled` flag, and previews
 * the Discord card inline. Falls back to a disabled/amber warning when
 * `window.electronAPI` isn't available (web/dev preview).
 */
export default function DiscordStep() {
  const { t } = useTranslation('onboarding');
  const { enabled, saving, saved, onToggle } = useDiscordStep();

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
      <div className="flex flex-col gap-3 rounded-xl border border-border-glass bg-foreground/[0.02] p-4">
        {!IS_ELECTRON && (
          <p className="text-xs text-status-warning">{t('step.discord.desktopOnly')}</p>
        )}

        <div className="border-b border-border-glass pb-3">
          <SettingsToggleRow
            id="onb-discord-label"
            title={t('step.discord.toggle.title')}
            description={t('step.discord.toggle.description')}
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={saving || !IS_ELECTRON}
          />
        </div>

        <DiscordPreviewCard enabled={enabled} />

        {saved && (
          <p
            role="status"
            className="flex items-center gap-1 font-mono text-2xs text-primary animate-fade-in"
          >
            <Check className="h-3 w-3" />
            {t('step.discord.saved')}
          </p>
        )}
      </div>

      <p className="mt-auto font-mono text-2xs normal-case text-muted-foreground">
        {t('step.discord.footnote')}
      </p>
    </StepLayout>
  );
}
