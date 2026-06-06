import { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { BookMarked, Check, Loader2, UserCircle } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { IS_ELECTRON } from '@/lib/platform';
import { handleImageError } from '@/lib/image-utils';
import { tDynamic } from '@/lib/i18n';
import { useMalAuthStore } from '@/stores/useMalAuthStore';

/**
 * Step 08 · MyAnimeList account (optional).
 *
 * The MAL twin of {@link AniListStep}: connects the user's MyAnimeList account so
 * their list and profile sync. The token is held main-side and never crosses IPC
 * — this step only ever reads a {@link MalAuthStatus} via the `useMalAuthStore`,
 * mirroring AccountsSection. Entirely optional: the wizard footer lets the user
 * proceed without connecting, so nothing here gates advancement.
 */
export function MalStep() {
  const { t, i18n } = useTranslation('onboarding');
  const status = useMalAuthStore(s => s.status);
  const loading = useMalAuthStore(s => s.loading);
  const error = useMalAuthStore(s => s.error);
  const fetchStatus = useMalAuthStore(s => s.fetchStatus);
  const connect = useMalAuthStore(s => s.connect);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const { connected, viewer } = status;

  // Store errors are full `namespace:key` refs (e.g. `accounts:mal.*`) so the
  // store stays i18n-agnostic; resolve them here against the active language.
  const errorMessage = error ? tDynamic(i18n, error) : null;

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
      stepTitle={t('step.mal.title')}
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border-glass bg-foreground/[0.02] p-4">
        {!IS_ELECTRON && <p className="text-xs text-amber-500">{t('step.mal.desktopOnly')}</p>}

        {connected && viewer ? (
          <div className="flex items-center gap-3">
            {viewer.avatar ? (
              <img
                src={viewer.avatar}
                alt=""
                onError={handleImageError}
                className="size-11 flex-shrink-0 rounded-full border border-border-glass object-cover"
              />
            ) : (
              <div className="grid size-11 flex-shrink-0 place-items-center rounded-full border border-border-glass bg-muted/25">
                <UserCircle className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-foreground">
                <Check className="size-3.5 flex-shrink-0 text-[oklch(0.78_0.15_140)]" />
                {t('step.mal.connectedAs', { name: viewer.name })}
              </p>
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                {t('step.mal.connectedHint')}
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void connect()}
            disabled={loading || !IS_ELECTRON}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-primary/35 bg-primary/15 px-4 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? t('step.mal.connecting') : t('step.mal.connect')}
          </button>
        )}

        {/* In web preview `fetchStatus` sets the `desktopOnly` sentinel error; the
            amber notice above already covers that case, so only surface real
            (Electron) errors here to avoid a duplicate message. */}
        {IS_ELECTRON && errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}

        <ul className="flex flex-col gap-1.5 border-t border-border-glass pt-3 font-mono text-[10.5px] text-[oklch(0.72_0.03_300)]">
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 flex-shrink-0 text-primary" />
            {t('step.mal.benefit.library')}
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 flex-shrink-0 text-primary" />
            {t('step.mal.benefit.profile')}
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 flex-shrink-0 text-primary" />
            {t('step.mal.benefit.twoWay')}
          </li>
        </ul>
      </div>

      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('step.mal.footnote')}
      </p>
    </StepLayout>
  );
}
