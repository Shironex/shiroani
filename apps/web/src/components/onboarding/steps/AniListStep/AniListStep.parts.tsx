import { useTranslation } from 'react-i18next';
import { Check, Loader2, UserCircle } from 'lucide-react';
import type { AniListViewer } from '@shiroani/shared';
import { IS_ELECTRON } from '@/lib/platform';
import { handleImageError } from '@/lib/image-utils';

interface IAniListAccountCardProps {
  connected: boolean;
  viewer?: AniListViewer;
  loading: boolean;
  errorMessage: string | null;
  connect: () => Promise<void>;
}

/**
 * The AniList connection card: connected viewer (avatar + name) or a connect
 * button, plus the benefit list. Disabled with an amber notice off-Electron.
 */
export function AniListAccountCard({
  connected,
  viewer,
  loading,
  errorMessage,
  connect,
}: IAniListAccountCardProps) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-glass bg-foreground/[0.02] p-4">
      {!IS_ELECTRON && <p className="text-xs text-amber-500">{t('step.anilist.desktopOnly')}</p>}

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
              {t('step.anilist.connectedAs', { name: viewer.name })}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {t('step.anilist.connectedHint')}
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
          {loading ? t('step.anilist.connecting') : t('step.anilist.connect')}
        </button>
      )}

      {/* In web preview `fetchStatus` sets the `desktopOnly` sentinel error; the
          amber notice above already covers that case, so only surface real
          (Electron) errors here to avoid a duplicate message. */}
      {IS_ELECTRON && errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}

      <ul className="flex flex-col gap-1.5 border-t border-border-glass pt-3 font-mono text-[10.5px] text-[oklch(0.72_0.03_300)]">
        <li className="flex items-center gap-2">
          <Check className="h-3 w-3 flex-shrink-0 text-primary" />
          {t('step.anilist.benefit.library')}
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3 w-3 flex-shrink-0 text-primary" />
          {t('step.anilist.benefit.profile')}
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3 w-3 flex-shrink-0 text-primary" />
          {t('step.anilist.benefit.twoWay')}
        </li>
      </ul>
    </div>
  );
}
