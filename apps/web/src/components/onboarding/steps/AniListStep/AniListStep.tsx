import { Trans, useTranslation } from 'react-i18next';
import { Library } from 'lucide-react';
import { ExperimentalBadge } from '@/components/ui/experimental-badge';
import { StepLayout } from '../../StepLayout';
import { useAniListStep } from './AniListStep.hooks';
import { AniListAccountCard } from './AniListStep.parts';

/**
 * Step 07 · AniList account (optional).
 *
 * Connects the user's AniList account so their library and profile sync. The
 * token is held main-side and never crosses IPC — this step only ever reads an
 * {@link AniListAuthStatus} via the `useAniListAuthStore`, mirroring
 * AccountsSection. Entirely optional: the wizard footer (Next / progress dots)
 * lets the user proceed without connecting, so nothing here gates advancement.
 */
export default function AniListStep() {
  const { t } = useTranslation('onboarding');
  const { t: tCommon } = useTranslation('common');
  const { connected, viewer, loading, errorMessage, connect } = useAniListStep();
  const emPrimary = <em className="not-italic text-primary italic" />;
  const bStrong = <b className="font-semibold text-foreground" />;
  const bPrimary = <b className="font-bold text-primary" />;

  return (
    <StepLayout
      kanji="繋"
      headline={
        <Trans ns="onboarding" i18nKey="step.anilist.headline" components={{ 1: emPrimary }} />
      }
      description={
        <Trans ns="onboarding" i18nKey="step.anilist.description" components={{ 1: bStrong }} />
      }
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.anilist.marker" components={{ 1: bPrimary }} />
      }
      stepIcon={<Library className="h-5 w-5" />}
      stepTitle={
        <>
          {t('step.anilist.title')}
          <ExperimentalBadge />
        </>
      }
      stepHint={tCommon('experimental.hint')}
    >
      <AniListAccountCard
        connected={connected}
        viewer={viewer}
        loading={loading}
        errorMessage={errorMessage}
        connect={connect}
      />

      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.anilist.footnote')}
      </p>
    </StepLayout>
  );
}
