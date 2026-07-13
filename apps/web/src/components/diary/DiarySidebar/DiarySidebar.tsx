import { Clapperboard, Building2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenreBreakdown } from '@/components/profile/GenreBreakdown';
import { StudioBreakdown } from '@/components/profile/StudioBreakdown';
import { useDiarySidebar } from './DiarySidebar.hooks';
import {
  ActivityHeatmap,
  SidebarLabel,
  SidebarSection,
  StatTile,
  StreakCard,
  TopTagsBlock,
} from './DiarySidebar.parts';
import type { IDiarySidebarProps } from './DiarySidebar.types';

/**
 * Right-hand panel on the Diary view — assembles the motivational side surface
 * described in the redesign mock: streak card, 2×2 stat grid, activity
 * heatmap and popular tags. All values are derived from the currently loaded
 * entries (no network calls).
 */
export default function DiarySidebar({ entries }: IDiarySidebarProps) {
  const {
    t,
    stats,
    milestone,
    achievedMilestone,
    failedCount,
    retryFailedDetails,
    genres,
    studios,
  } = useDiarySidebar(entries);

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col gap-5',
        'border-l border-border-glass bg-foreground/[0.015]',
        'px-5 py-5'
      )}
    >
      <StreakCard
        current={stats.currentStreak}
        longest={stats.longestStreak}
        milestone={milestone}
        achievedMilestone={achievedMilestone}
      />

      <SidebarSection>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label={t('sidebar.stats.totalEntries')} value={stats.total} />
          <StatTile
            label={t('sidebar.stats.thisMonth')}
            value={stats.thisMonth}
            sub={t('sidebar.stats.thisMonthSub', { count: stats.thisMonth })}
          />
          <StatTile
            label={t('sidebar.stats.longestStreak')}
            value={stats.longestStreak}
            sub={t('sidebar.stats.longestStreakSub', { count: stats.longestStreak })}
          />
          <StatTile
            label={t('sidebar.stats.linkedToAnime')}
            value={stats.linkedToAnime}
            sub={t('sidebar.stats.linkedToAnimeSub', { count: stats.linkedToAnime })}
          />
        </div>
      </SidebarSection>

      <ActivityHeatmap
        weeks={stats.activeDaysByWeekOfYear}
        maxCount={stats.maxWeekCount}
        total={stats.total}
      />

      <TopTagsBlock tags={stats.topTags} />

      {failedCount > 0 && (
        <button
          type="button"
          onClick={retryFailedDetails}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg border border-border-glass',
            'bg-foreground/[0.03] px-3 py-2 text-[11px] text-muted-foreground',
            'transition-colors hover:bg-foreground/[0.06] hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
          {t('sidebar.breakdownRetry', { count: failedCount })}
        </button>
      )}

      <SidebarSection>
        <SidebarLabel icon={Clapperboard}>{t('sidebar.genres')}</SidebarLabel>
        <GenreBreakdown genres={genres} />
      </SidebarSection>

      <SidebarSection>
        <SidebarLabel icon={Building2}>{t('sidebar.studios')}</SidebarLabel>
        <StudioBreakdown studios={studios} />
      </SidebarSection>
    </aside>
  );
}
