import { cn } from '@/lib/utils';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { Timeline, type TimelineEntry } from '@/components/shared/Timeline';
import { useChangelogView } from './ChangelogView.hooks';
import { Header, OriginMarker, ReleaseCard } from './ChangelogView.parts';
import type { IChangelogViewProps } from './ChangelogView.types';

/**
 * ChangelogView — vertical release timeline (sticky headline + kanji watermark,
 * filter chips, and a vertical timeline of color-coded release cards). Entry
 * data comes from `@/lib/changelog-entries` (a thin adapter over the shared
 * `@shiroani/changelog` package); rendered as a full dockable view from
 * `App.tsx` (`activeView === 'changelog'`).
 */
export default function ChangelogView({ compact = false, className }: IChangelogViewProps) {
  const { filter, onFilterChange, filters, jumpTargets, latest, visible, showOrigin } =
    useChangelogView();

  const entries: TimelineEntry[] = visible.map(release => ({
    id: `v${release.version}`,
    title: <>v{release.version}</>,
    timestamp: release.shortDate,
    markerVariant: release.latest ? 'solid' : 'outline',
    children: <ReleaseCard release={release} />,
  }));

  // Closing dashed marker — only shown when viewing the full list.
  if (showOrigin) {
    entries.push({ id: 'origin', markerVariant: 'dashed', children: <OriginMarker /> });
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col overflow-hidden animate-fade-in',
        !compact && 'relative',
        className
      )}
    >
      {!compact && <KanjiWatermark kanji="記録" position="tr" size={280} opacity={0.035} />}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1100px] px-8 pb-20">
          <Header
            filter={filter}
            onFilterChange={onFilterChange}
            filters={filters}
            jumpTargets={jumpTargets}
            latest={latest}
            compact={compact}
          />

          <Timeline entries={entries} className="mt-6" sideWidth={76} gap={48} />
        </div>
      </div>
    </div>
  );
}
