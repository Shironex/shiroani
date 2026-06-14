import { Trans, useTranslation } from 'react-i18next';
import { BookMarked } from 'lucide-react';
import { ExperimentalBadge } from '@/components/ui/experimental-badge';
import { StepLayout } from '../../StepLayout';
import { useMalStep } from './MalStep.hooks';
import { MalAccountCard } from './MalStep.parts';

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
  const emPrimary = <em className="not-italic text-primary italic" />;
  const bStrong = <b className="font-semibold text-foreground" />;
  const bPrimary = <b className="font-bold text-primary" />;

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
      <MalAccountCard
        connected={connected}
        viewer={viewer}
        loading={loading}
        errorMessage={errorMessage}
        connect={connect}
      />

      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.mal.footnote')}
      </p>
    </StepLayout>
  );
}
