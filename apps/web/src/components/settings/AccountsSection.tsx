import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle, LogOut, Loader2, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { SettingsCard, SettingsInfoCallout } from '@/components/settings/SettingsCard';
import { SyncModeSelector, PushLibraryButton } from '@/components/settings/SyncDirectionControls';
import { handleImageError } from '@/lib/image-utils';
import { tDynamic } from '@/lib/i18n';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListSyncStore } from '@/stores/useAniListSyncStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { useMalSyncStore } from '@/stores/useMalSyncStore';
import type { FullSyncDirection } from '@shiroani/shared';

/**
 * Direction-aware copy for the "Sync now" confirm dialog. Push-only and pull-only
 * are one-way — and push-only OVERWRITES the remote — so the dialog must state
 * that plainly instead of reusing the two-way reconcile copy (which would
 * misrepresent a destructive push as a merge).
 */
function syncConfirmCopy(
  i18n: Parameters<typeof tDynamic>[0],
  provider: 'anilist' | 'mal',
  mode: FullSyncDirection
): { title: string; description: string } {
  const base = `accounts:${provider}.sync`;
  if (mode === 'push') {
    return {
      title: tDynamic(i18n, `${base}.confirmPushTitle`),
      description: tDynamic(i18n, `${base}.confirmPushDescription`),
    };
  }
  if (mode === 'pull') {
    return {
      title: tDynamic(i18n, `${base}.confirmPullTitle`),
      description: tDynamic(i18n, `${base}.confirmPullDescription`),
    };
  }
  return {
    title: tDynamic(i18n, `${base}.confirmTitle`),
    description: tDynamic(i18n, `${base}.confirmDescription`),
  };
}

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

      <MalAccountCard />
    </div>
  );
}

/**
 * MyAnimeList connect/disconnect card. Mirrors the AniList card above but reads
 * its own {@link useMalAuthStore} (independent connection + error state).
 *
 * Like AniList, neither the access nor the refresh token crosses IPC — this
 * component only ever reads a {@link MalAuthStatus} via the `malAuth` bridge
 * (proxied through `useMalAuthStore`), so nothing sensitive is handled here.
 * In dev builds MAL credentials may be absent; when `connect` returns the
 * "not configured" rejection the store maps it to `mal.notConfigured`, surfaced
 * in the callout below.
 */
function MalAccountCard() {
  const { t, i18n } = useTranslation('accounts');
  const status = useMalAuthStore(s => s.status);
  const loading = useMalAuthStore(s => s.loading);
  const error = useMalAuthStore(s => s.error);
  const fetchStatus = useMalAuthStore(s => s.fetchStatus);
  const connect = useMalAuthStore(s => s.connect);
  const disconnect = useMalAuthStore(s => s.disconnect);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const { connected, viewer, expiresAt } = status;

  // Error keys are stored as full `namespace:key` references so the store stays
  // i18n-agnostic; resolve them here against the active language.
  const errorMessage = error ? tDynamic(i18n, error) : null;

  const expiryHint =
    connected && typeof expiresAt === 'number'
      ? t('mal.expiresAt', { date: new Date(expiresAt).toLocaleString(i18n.language) })
      : null;

  return (
    <>
      <SettingsCard icon={UserCircle} title={t('mal.title')} subtitle={t('mal.description')}>
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
                {t('mal.connectedAs', { name: viewer.name })}
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
              {t('mal.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">{t('mal.disconnected')}</p>
            <Button
              size="sm"
              onClick={() => void connect()}
              disabled={loading}
              className="flex-shrink-0"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? t('mal.connecting') : t('mal.connect')}
            </Button>
          </div>
        )}
      </SettingsCard>

      {connected && <MalSyncCard />}

      {errorMessage && (
        <SettingsInfoCallout
          icon={AlertCircle}
          iconClassName="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        >
          {errorMessage}
        </SettingsInfoCallout>
      )}
    </>
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
  const entrySyncingId = useAniListSyncStore(s => s.entrySyncingId);
  const progress = useAniListSyncStore(s => s.progress);
  const result = useAniListSyncStore(s => s.result);
  const error = useAniListSyncStore(s => s.error);
  const lastSyncedAt = useAniListSyncStore(s => s.lastSyncedAt);
  const sync = useAniListSyncStore(s => s.sync);
  const directionMode = useAniListSyncStore(s => s.directionMode);
  const setDirectionMode = useAniListSyncStore(s => s.setDirectionMode);
  const pushLibrary = useAniListSyncStore(s => s.pushLibrary);

  const [confirmOpen, setConfirmOpen] = useState(false);
  // Both the full sync and a per-entry sync share one main-side guard, so any
  // in-flight sync disables every trigger on this card.
  const busy = syncing || entrySyncingId !== null;

  const errorMessage = error ? tDynamic(i18n, error) : null;
  const lastSyncedHint = lastSyncedAt
    ? t('anilist.sync.lastSynced', {
        date: new Date(lastSyncedAt).toLocaleString(i18n.language),
      })
    : null;
  const anilistConfirmCopy = syncConfirmCopy(i18n, 'anilist', directionMode);

  return (
    <>
      <SettingsCard
        icon={RefreshCw}
        tone="blue"
        title={t('anilist.sync.title')}
        subtitle={t('anilist.sync.description')}
      >
        <SyncModeSelector
          provider="anilist"
          value={directionMode}
          onChange={setDirectionMode}
          disabled={busy}
        />

        <div className="mt-3 flex items-center justify-between gap-3">
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
          <PushLibraryButton provider="anilist" onPush={pushLibrary} disabled={busy} />
          <Button
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
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
        title={anilistConfirmCopy.title}
        description={anilistConfirmCopy.description}
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

/**
 * Two-way MyAnimeList sync controls. The MAL twin of {@link AniListSyncCard},
 * rendered only when a MAL account is connected. Reads its OWN
 * {@link useMalSyncStore} — MAL and AniList have independent single-flight guards
 * main-side and can run concurrently, so this card never gates on AniList sync
 * state. The "Sync now" button is gated behind a confirmation dialog because
 * sync may add or modify entries on the user's real MAL account; live progress
 * and the final tally render inline in the card.
 */
function MalSyncCard() {
  const { t, i18n } = useTranslation('accounts');
  const syncing = useMalSyncStore(s => s.syncing);
  const entrySyncingId = useMalSyncStore(s => s.entrySyncingId);
  const progress = useMalSyncStore(s => s.progress);
  const result = useMalSyncStore(s => s.result);
  const error = useMalSyncStore(s => s.error);
  const lastSyncedAt = useMalSyncStore(s => s.lastSyncedAt);
  const sync = useMalSyncStore(s => s.sync);
  const directionMode = useMalSyncStore(s => s.directionMode);
  const setDirectionMode = useMalSyncStore(s => s.setDirectionMode);
  const pushLibrary = useMalSyncStore(s => s.pushLibrary);

  const [confirmOpen, setConfirmOpen] = useState(false);
  // Both the full sync and a per-entry sync share one main-side guard (for MAL),
  // so any in-flight MAL sync disables every trigger on this card.
  const busy = syncing || entrySyncingId !== null;

  const errorMessage = error ? tDynamic(i18n, error) : null;
  const lastSyncedHint = lastSyncedAt
    ? t('mal.sync.lastSynced', {
        date: new Date(lastSyncedAt).toLocaleString(i18n.language),
      })
    : null;
  const malConfirmCopy = syncConfirmCopy(i18n, 'mal', directionMode);

  return (
    <>
      <SettingsCard
        icon={RefreshCw}
        tone="blue"
        title={t('mal.sync.title')}
        subtitle={t('mal.sync.description')}
      >
        <SyncModeSelector
          provider="mal"
          value={directionMode}
          onChange={setDirectionMode}
          disabled={busy}
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          {/* Busy state is conveyed via aria-busy + the button label; the per-entry
              line is NOT aria-live (it would announce once per item — far too
              chatty). The completion summary below carries the announced outcome. */}
          <div className="min-w-0 flex-1" aria-busy={syncing}>
            {syncing ? (
              <p className="truncate text-[12px] text-muted-foreground">
                {progress
                  ? t('mal.sync.progressLabel', {
                      current: progress.current,
                      total: progress.total,
                      title: progress.title,
                    })
                  : t('mal.sync.syncing')}
              </p>
            ) : (
              lastSyncedHint && (
                <p className="truncate text-[11.5px] text-muted-foreground">{lastSyncedHint}</p>
              )
            )}
          </div>
          <PushLibraryButton provider="mal" onPush={pushLibrary} disabled={busy} />
          <Button
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="flex-shrink-0"
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {syncing ? t('mal.sync.syncing') : t('mal.sync.button')}
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
              {t('mal.sync.summary', {
                imported: result.imported,
                pushedNew: result.pushedNew,
                updatedLocal: result.updatedLocal,
                updatedRemote: result.updatedRemote,
              })}
            </p>
            {result.conflicts > 0 && (
              <p>{t('mal.sync.summaryConflicts', { count: result.conflicts })}</p>
            )}
            {result.skippedNoId > 0 && (
              <p>{t('mal.sync.summarySkipped', { count: result.skippedNoId })}</p>
            )}
            {result.errors > 0 && (
              <p className="text-destructive">
                {t('mal.sync.summaryErrors', { count: result.errors })}
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
        title={malConfirmCopy.title}
        description={malConfirmCopy.description}
        confirmLabel={t('mal.sync.confirmButton')}
        variant="default"
        onConfirm={() => {
          setConfirmOpen(false);
          void sync();
        }}
      />
    </>
  );
}
