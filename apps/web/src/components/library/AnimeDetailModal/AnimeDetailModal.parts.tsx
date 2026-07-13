import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Upload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/shared/Eyebrow';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListSyncStore } from '@/stores/useAniListSyncStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { useMalSyncStore } from '@/stores/useMalSyncStore';
import { toast } from 'sonner';
import type { SyncEntryDirection } from '@shiroani/shared';
import type { IEntrySyncSectionProps } from './AnimeDetailModal.types';

/**
 * Manual single-entry sync controls for ONE provider (AniList or MyAnimeList).
 * Rendered only for entries that carry that provider's id (the parent gates on
 * `entry.anilistId` / `entry.malId`), and self-gates on a connected account so
 * it shows nothing when that provider is disconnected.
 *
 * Three directions:
 *  - push  — overwrite the remote entry from the local row (local wins)
 *  - pull  — overwrite the local row from the remote entry (remote wins)
 *  - auto  — run the same latest-wins merge a full sync would
 *
 * The three buttons are disabled while a full sync OR another per-entry sync of
 * the SAME provider is running (each provider has its own single-flight guard
 * main-side). The two providers are independent — an AniList sync never disables
 * the MAL controls and vice versa. Both stores are subscribed unconditionally
 * (rules of hooks) and the active one is selected by `provider`. On success the
 * gateway broadcasts `LibraryEvents.UPDATED`, so the library store re-fetches and
 * the card/row sync badge refreshes automatically — no manual refetch here.
 */
export function EntrySyncSection({ entryId, provider }: IEntrySyncSectionProps) {
  const { t } = useTranslation('library');
  const isMal = provider === 'mal';

  const anilistConnected = useAniListAuthStore(s => s.status.connected);
  const malConnected = useMalAuthStore(s => s.status.connected);

  const anilistFullSyncing = useAniListSyncStore(s => s.syncing);
  const anilistEntrySyncingId = useAniListSyncStore(s => s.entrySyncingId);
  const anilistSyncEntry = useAniListSyncStore(s => s.syncEntry);

  const malFullSyncing = useMalSyncStore(s => s.syncing);
  const malEntrySyncingId = useMalSyncStore(s => s.entrySyncingId);
  const malSyncEntry = useMalSyncStore(s => s.syncEntry);

  const connected = isMal ? malConnected : anilistConnected;
  const fullSyncing = isMal ? malFullSyncing : anilistFullSyncing;
  const entrySyncingId = isMal ? malEntrySyncingId : anilistEntrySyncingId;
  const syncEntry = isMal ? malSyncEntry : anilistSyncEntry;

  const busy = entrySyncingId === entryId;
  // Disabled while ANY sync of THIS provider is in flight: a full run, this
  // entry, or another entry. The other provider's state is intentionally ignored.
  const disabled = fullSyncing || entrySyncingId !== null;

  // Track which direction is in flight so the spinner lands on the button the
  // user actually pressed (push / pull / auto), not always on auto.
  const [pendingDirection, setPendingDirection] = useState<SyncEntryDirection | null>(null);

  const handleSync = useCallback(
    async (direction: SyncEntryDirection) => {
      setPendingDirection(direction);
      try {
        const action = await syncEntry(entryId, direction);
        // Treat both a thrown rejection and a resolved `action: 'error'` (and a
        // pre-flight 'error' returned when a sync is already running) as failure —
        // the thunk maps every failure mode to 'error'.
        if (action === 'error') {
          toast.error(t(`sync.${provider}.entry.error`));
          return;
        }
        if (action === 'skipped') {
          toast.warning(t(`sync.${provider}.entry.skipped`));
          return;
        }
        toast.success(t(`sync.${provider}.entry.result.${action}`));
      } finally {
        setPendingDirection(null);
      }
    },
    [syncEntry, entryId, t, provider]
  );

  if (!connected) return null;

  return (
    <div className="space-y-2">
      <Eyebrow>{t(`sync.${provider}.entry.title`)}</Eyebrow>
      <p className="text-2xs text-muted-foreground">{t(`sync.${provider}.entry.hint`)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={disabled}
          onClick={() => void handleSync('auto')}
        >
          {busy && pendingDirection === 'auto' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {t(`sync.${provider}.entry.auto`)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={disabled}
          onClick={() => void handleSync('push')}
        >
          {busy && pendingDirection === 'push' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {t(`sync.${provider}.entry.push`)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={disabled}
          onClick={() => void handleSync('pull')}
        >
          {busy && pendingDirection === 'pull' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {t(`sync.${provider}.entry.pull`)}
        </Button>
      </div>
    </div>
  );
}

export function SheetStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <span className="text-[13px] font-bold text-foreground leading-[1.2] tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function SheetDivider() {
  return <div className="h-px bg-border-glass" />;
}
