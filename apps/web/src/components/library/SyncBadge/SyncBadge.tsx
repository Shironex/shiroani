import { memo } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncBadge } from './SyncBadge.hooks';
import type { ISyncBadgeProps } from './SyncBadge.types';

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
 * Renders nothing (no wrapper at all) when the provider's account is not
 * connected or the entry has no provider id — see the hook for the gating.
 *
 * Cheap to render per the repeated-card perf rule: a single <span> with a native
 * `title` (NOT a Radix Tooltip — one tooltip state machine per card across a
 * non-virtualized grid was measurable overhead) and `role="img"` so the
 * aria-label is exposed as the accessible name.
 */
const SyncBadge = memo(function SyncBadge(props: ISyncBadgeProps) {
  const view = useSyncBadge(props);
  if (!view) return null;

  const { isSynced, tooltipLabel } = view;
  const Icon = isSynced ? Cloud : CloudOff;

  return (
    <span
      role="img"
      aria-label={tooltipLabel}
      title={tooltipLabel}
      className={cn(
        'inline-flex items-center justify-center',
        isSynced ? 'text-[oklch(0.7_0.12_230)]' : 'text-muted-foreground/50',
        props.className
      )}
    >
      <Icon className={cn('shrink-0', props.iconClassName ?? 'w-3.5 h-3.5')} strokeWidth={2} />
    </span>
  );
});

export default SyncBadge;
