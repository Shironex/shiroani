import { Trans, useTranslation } from 'react-i18next';
import { BookMarked } from 'lucide-react';
import { ExperimentalBadge } from '@/components/ui/experimental-badge';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bStrong, bPrimary, OnboardingAccountCard } from '../../shared-parts';
import { useMalStep } from './MalStep.hooks';

/**
 * Step 08 · MyAnimeList account (optional).
 *
 * The MAL twin of {@link AniListStep}: connects the user's MyAnimeList account so
 * their list and profile sync. The token is held main-side and never crosses IPC
 * — this step only ever reads a {@link MalAuthStatus} via the `useMalAuthStore`,
 * mirroring AccountsSection. Entirely optional: the wizard footer lets the user
 * proceed without connecting, so nothing here gates advancement.
 */
export default function MalStep() {
  const { t } = useTranslation('onboarding');
  const { t: tCommon } = useTranslation('common');
  const { connected, viewer, loading, errorMessage, connect } = useMalStep();

  return (
    <StepLayout
      kanji="録"
      headline={<Trans ns="onboarding" i18nKey="step.mal.headline" components={{ 1: emPrimary }} />}
      description={
        <Trans ns="onboarding" i18nKey="step.mal.description" components={{ 1: bStrong }} />
      }
      stepMarker={<Trans ns="onboarding" i18nKey="step.mal.marker" components={{ 1: bPrimary }} />}
      stepIcon={<BookMarked className="h-5 w-5" />}
      stepTitle={
        <>
          {t('step.mal.title')}
          <ExperimentalBadge />
        </>
      }
      stepHint={tCommon('experimental.hint')}
    >
      <OnboardingAccountCard
        keyPrefix="step.mal"
        connected={connected}
        viewer={viewer}
        loading={loading}
        errorMessage={errorMessage}
        connect={connect}
      />

      <p className="mt-auto font-mono text-2xs normal-case text-muted-foreground">
        {t('step.mal.footnote')}
      </p>
    </StepLayout>
  );
}
