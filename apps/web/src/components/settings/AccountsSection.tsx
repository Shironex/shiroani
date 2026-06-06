import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle, LogOut, Loader2, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { SettingsCard, SettingsInfoCallout } from '@/components/settings/SettingsCard';
import { handleImageError } from '@/lib/image-utils';
import { tDynamic } from '@/lib/i18n';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListSyncStore } from '@/stores/useAniListSyncStore';

/**
 * Accounts settings section.
 *
 * Connected-accounts panel for external integrations. Currently AniList OAuth.
 * The token is held main-side and never crosses IPC — this component only ever
 * reads an {@link AniListAuthStatus} via the `anilistAuth` bridge (proxied
 * through the `useAniListAuthStore`), so nothing sensitive is handled here.
 */
export function AccountsSection() {
  const { t, i18n } = useTranslation('accounts');
  const status = useAniListAuthStore(s => s.status);
  const loading = useAniListAuthStore(s => s.loading);
  const error = useAniListAuthStore(s => s.error);
  const fetchStatus = useAniListAuthStore(s => s.fetchStatus);
  const connect = useAniListAuthStore(s => s.connect);
  const disconnect = useAniListAuthStore(s => s.disconnect);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const { connected, viewer, expiresAt } = status;

  // Error keys are stored as full `namespace:key` references so the store stays
  // i18n-agnostic; resolve them here against the active language.
  const errorMessage = error ? tDynamic(i18n, error) : null;

  const expiryHint =
    connected && typeof expiresAt === 'number'
      ? t('anilist.expiresAt', { date: new Date(expiresAt).toLocaleString(i18n.language) })
      : null;

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={UserCircle}
        title={t('anilist.title')}
        subtitle={t('anilist.description')}
      >
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
    </div>
  );
}

/**
 * Two-way AniList sync controls. Rendered only when an account is connected.
 * The "Sync now" button is gated behind a confirmation dialog because sync may
 * add or modify entries on the user's real AniList account; live progress and
 * the final tally render inline in the card.
 */
function AniListSyncCard() {
  const { t, i18n } = useTranslation('accounts');
  const syncing = useAniListSyncStore(s => s.syncing);
  const progress = useAniListSyncStore(s => s.progress);
  const result = useAniListSyncStore(s => s.result);
  const error = useAniListSyncStore(s => s.error);
  const lastSyncedAt = useAniListSyncStore(s => s.lastSyncedAt);
  const sync = useAniListSyncStore(s => s.sync);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const errorMessage = error ? tDynamic(i18n, error) : null;
  const lastSyncedHint = lastSyncedAt
    ? t('anilist.sync.lastSynced', {
        date: new Date(lastSyncedAt).toLocaleString(i18n.language),
      })
    : null;

  return (
    <>
      <SettingsCard
        icon={RefreshCw}
        tone="blue"
        title={t('anilist.sync.title')}
        subtitle={t('anilist.sync.description')}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Busy state is conveyed via aria-busy + the button label; the per-entry
              line is NOT aria-live (it would announce once per item — far too
              chatty). The completion summary below carries the announced outcome. */}
          <div className="min-w-0 flex-1" aria-busy={syncing}>
            {syncing ? (
              <p className="truncate text-[12px] text-muted-foreground">
                {progress
                  ? t('anilist.sync.progressLabel', {
                      current: progress.current,
                      total: progress.total,
                      title: progress.title,
                    })
                  : t('anilist.sync.syncing')}
              </p>
            ) : (
              lastSyncedHint && (
                <p className="truncate text-[11.5px] text-muted-foreground">{lastSyncedHint}</p>
              )
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={syncing}
            className="flex-shrink-0"
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {syncing ? t('anilist.sync.syncing') : t('anilist.sync.button')}
          </Button>
        </div>

        {syncing && (
          <ProgressBar
            className="mt-3"
            indeterminate={!progress || progress.total <= 0}
            value={
              progress && progress.total > 0
                ? Math.round((progress.current / progress.total) * 100)
                : 0
            }
          />
        )}

        {result && !syncing && (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 space-y-1 border-t border-border-glass/60 pt-3 text-[12px] text-muted-foreground"
          >
            <p>
              {t('anilist.sync.summary', {
                imported: result.imported,
                pushedNew: result.pushedNew,
                updatedLocal: result.updatedLocal,
                updatedRemote: result.updatedRemote,
              })}
            </p>
            {result.conflicts > 0 && (
              <p>{t('anilist.sync.summaryConflicts', { count: result.conflicts })}</p>
            )}
            {result.skippedNoId > 0 && (
              <p>{t('anilist.sync.summarySkipped', { count: result.skippedNoId })}</p>
            )}
            {result.errors > 0 && (
              <p className="text-destructive">
                {t('anilist.sync.summaryErrors', { count: result.errors })}
              </p>
            )}
          </div>
        )}
      </SettingsCard>

      {errorMessage && (
        <SettingsInfoCallout
          icon={AlertCircle}
          iconClassName="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        >
          {errorMessage}
        </SettingsInfoCallout>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('anilist.sync.confirmTitle')}
        description={t('anilist.sync.confirmDescription')}
        confirmLabel={t('anilist.sync.confirmButton')}
        variant="default"
        onConfirm={() => {
          setConfirmOpen(false);
          void sync();
        }}
      />
    </>
  );
}
