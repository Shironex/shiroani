import { Trans, useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { SettingsToggleRow } from '@/components/settings/SettingsCard';
import { IS_ELECTRON } from '@/lib/platform';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bStrong, bPrimary } from '../../shared-parts';
import { useAdblockStep } from './AdblockStep.hooks';
import { BlockedRow } from './AdblockStep.parts';

/**
 * Step 06 · Ad blocking (browser).
 *
 * Toggles the EasyList + EasyPrivacy adblock in the built-in browser session.
 * Mirrors the old FinishStep wiring — the "finish" summary is now its own
 * screen (`SummaryStep`).
 */
export default function AdblockStep() {
  const { t } = useTranslation('onboarding');
  const { adblockEnabled, setAdblockEnabled } = useAdblockStep();

  return (
    <StepLayout
      kanji="盾"
      headline={
        <Trans ns="onboarding" i18nKey="step.adblock.headline" components={{ 1: emPrimary }} />
      }
      description={
        <Trans ns="onboarding" i18nKey="step.adblock.description" components={{ 1: bStrong }} />
      }
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.adblock.marker" components={{ 1: bPrimary }} />
      }
      stepIcon={<Shield className="h-5 w-5" />}
      stepTitle={t('step.adblock.title')}
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border-glass bg-foreground/[0.02] p-4">
        {!IS_ELECTRON && (
          <p className="text-xs text-status-warning">{t('step.adblock.desktopOnly')}</p>
        )}

        <div className="flex items-start gap-3 border-b border-border-glass pb-3">
          <span
            className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/15 text-primary"
            aria-hidden="true"
          >
            <Shield className="h-4 w-4" />
          </span>
          <SettingsToggleRow
            className="flex-1"
            id="onb-adblock-label"
            title={t('step.adblock.toggle.title')}
            description={t('step.adblock.toggle.description')}
            checked={adblockEnabled}
            onCheckedChange={setAdblockEnabled}
            disabled={!IS_ELECTRON}
          />
        </div>

        <ul
          className="flex flex-col font-mono text-2xs"
          aria-label={t('step.adblock.blockedListAria')}
        >
          <BlockedRow label={t('step.adblock.blocked.ads')} />
          <BlockedRow label={t('step.adblock.blocked.trackers')} />
          <BlockedRow label={t('step.adblock.blocked.videoAds')} />
          <BlockedRow label={t('step.adblock.blocked.cookieWalls')} />
          <BlockedRow label={t('step.adblock.blocked.exceptions')} variant="add" />
        </ul>
      </div>

      <p className="mt-auto font-mono text-2xs normal-case text-muted-foreground">
        {t('step.adblock.footnote')}
      </p>
    </StepLayout>
  );
}
