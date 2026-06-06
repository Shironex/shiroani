import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import type { AnimeEntry } from '@shiroani/shared';

/** Which external provider this badge reflects. */
type SyncProvider = 'anilist' | 'mal';

interface SyncBadgeProps {
  entry: Pick<AnimeEntry, 'anilistSyncedAt' | 'anilistId' | 'malSyncedAt' | 'malId'>;
  /** Which provider's sync state to render. Defaults to AniList. */
  provider?: SyncProvider;
  /** Extra classes for the badge wrapper (e.g. absolute positioning on a card). */
  className?: string;
  /** Icon size class (default `w-3.5 h-3.5`). */
  iconClassName?: string;
}

/**
 * Tiny per-entry sync indicator shown on library cards + list rows, for either
 * AniList or MyAnimeList (selected via `provider`). The two providers are
 * independent, so a call site renders one badge per connected provider — keep
 * them visually distinct via the wrapper layout at the call site.
 *
 * - Synced (the provider's `*SyncedAt` is a number): a cloud, tooltip shows the
 *   last-sync timestamp.
 * - Not yet reconciled (`*SyncedAt` is null/undefined): a muted cloud-off,
 *   tooltip explains it hasn't synced yet.
 *
 * Renders nothing (no wrapper at all) when:
 *  - the provider's account is not connected — a sync state would be
 *    meaningless, and
 *  - the entry has no provider id — it can't be reconciled, so showing a
 *    permanent "not synced" cloud the user can't act on would be misleading
 *    (this mirrors the detail modal, which only offers sync controls for entries
 *    that carry the matching id).
 *
 * Both auth hooks are subscribed unconditionally (a conditional hook would
 * violate the rules of hooks) and the relevant one is selected by `provider`.
 *
 * Cheap to render per the repeated-card perf rule: a single <span> with a native
 * `title` (NOT a Radix Tooltip — one tooltip state machine per card across a
 * non-virtualized grid was measurable overhead) and `role="img"` so the
 * aria-label is exposed as the accessible name.
 */
const SyncBadge = memo(function SyncBadge({
  entry,
  provider = 'anilist',
  className,
  iconClassName,
}: SyncBadgeProps) {
  const { t, i18n } = useTranslation('library');
  const anilistConnected = useAniListAuthStore(s => s.status.connected);
  const malConnected = useMalAuthStore(s => s.status.connected);

  const isMal = provider === 'mal';
  const connected = isMal ? malConnected : anilistConnected;
  const providerId = isMal ? entry.malId : entry.anilistId;
  const syncedAt = isMal ? entry.malSyncedAt : entry.anilistSyncedAt;

  if (!connected || !providerId) return null;

  const isSynced = typeof syncedAt === 'number';

  const tooltipLabel = isSynced
    ? t(`sync.${provider}.badge.synced`, {
        date: new Date(syncedAt as number).toLocaleString(i18n.language),
      })
    : t(`sync.${provider}.badge.notSynced`);

  const Icon = isSynced ? Cloud : CloudOff;

  return (
    <span
      role="img"
      aria-label={tooltipLabel}
      title={tooltipLabel}
      className={cn(
        'inline-flex items-center justify-center',
        isSynced ? 'text-[oklch(0.7_0.12_230)]' : 'text-muted-foreground/50',
        className
      )}
    >
      <Icon className={cn('shrink-0', iconClassName ?? 'w-3.5 h-3.5')} strokeWidth={2} />
    </span>
  );
});

export { SyncBadge };
