import { Trans, useTranslation } from 'react-i18next';
import { Library } from 'lucide-react';
import { ExperimentalBadge } from '@/components/ui/experimental-badge';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bStrong, bPrimary, OnboardingAccountCard } from '../../shared-parts';
import { useAniListStep } from './AniListStep.hooks';

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
      <OnboardingAccountCard
        keyPrefix="step.anilist"
        connected={connected}
        viewer={viewer}
        loading={loading}
        errorMessage={errorMessage}
        connect={connect}
      />

      <p className="mt-auto font-mono text-2xs normal-case text-muted-foreground">
        {t('step.anilist.footnote')}
      </p>
    </StepLayout>
  );
}
