import { useTranslation } from 'react-i18next';
import { UserCircle, LogOut, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsCard, SettingsInfoCallout } from '@/components/settings/SettingsCard';
import { ExperimentalBadge } from '@/components/ui/experimental-badge';
import { handleImageError } from '@/lib/image-utils';
import { useAccountsSection } from './AccountsSection.hooks';
import { AniListSyncCard, MalAccountCard } from './AccountsSection.parts';

/**
 * Accounts settings section.
 *
 * Connected-accounts panel for external integrations. Currently AniList OAuth.
 * The token is held main-side and never crosses IPC — this component only ever
 * reads an {@link AniListAuthStatus} via the `anilistAuth` bridge (proxied
 * through the `useAniListAuthStore`), so nothing sensitive is handled here.
 */
export default function AccountsSection() {
  const { t } = useTranslation('accounts');
  const { t: tCommon } = useTranslation('common');
  const { connected, viewer, loading, errorMessage, expiryHint, connect, disconnect } =
    useAccountsSection();

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={UserCircle}
        title={t('anilist.title')}
        subtitle={t('anilist.description')}
        headerAccessory={<ExperimentalBadge />}
      >
        <p className="text-[12px] leading-snug text-amber-700 dark:text-amber-400">
          {tCommon('experimental.hint')}
        </p>
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
                {t('anilist.connectedAs', { name: viewer.name })}
              </p>
              {expiryHint && (
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{expiryHint}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void disconnect()}
              disabled={loading}
              className="flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              {t('anilist.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">{t('anilist.disconnected')}</p>
            <Button
              size="sm"
              onClick={() => void connect()}
              disabled={loading}
              className="flex-shrink-0"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? t('anilist.connecting') : t('anilist.connect')}
            </Button>
          </div>
        )}
      </SettingsCard>

      {connected && <AniListSyncCard />}

      {errorMessage && (
        <SettingsInfoCallout
          icon={AlertCircle}
          iconClassName="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        >
          {errorMessage}
        </SettingsInfoCallout>
      )}

      <MalAccountCard />
    </div>
  );
}
