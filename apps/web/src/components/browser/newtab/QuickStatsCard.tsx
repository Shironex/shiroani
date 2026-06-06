import { memo, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Tv, Library, Flame } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import { cn } from '@/lib/utils';

/**
 * Compact "your numbers" card for the newtab page — a few motivational stats
 * pulled from local data, no AniList required.
 *
 * Sources:
 *   - Episodes watched → Σ `currentEpisode` across library entries. The local
 *     app-stats tracker only stores watch *seconds*, never an episode count, so
 *     the honest local episode tally is the user's tracked library progress.
 *   - Titles in library → library entry count.
 *   - Current streak → `app-stats.currentStreak.days`.
 *
 * The app-stats snapshot stays empty until something pulls it over IPC, which
 * normally only happens on the Profile surface. We fire a one-shot refresh on
 * mount so the streak reflects reality even when the newtab page is the first
 * thing the user sees — lighter than starting the 60s poll just for one number.
 */
export const QuickStatsCard = memo(function QuickStatsCard() {
  const { t } = useTranslation('browser');

  const entries = useLibraryStore(s => s.entries);
  const streakDays = useAppStatsStore(s => s.snapshot.currentStreak.days);

  const { libraryCount, episodesWatched } = useMemo(() => {
    let episodes = 0;
    for (const entry of entries) {
      episodes += entry.currentEpisode ?? 0;
    }
    return { libraryCount: entries.length, episodesWatched: episodes };
  }, [entries]);

  // One-shot pull so the streak isn't stuck at 0 on a fresh newtab load.
  useEffect(() => {
    void useAppStatsStore.getState().refresh();
  }, []);

  return (
    <section
      aria-labelledby="newtab-quickstats"
      className="relative rounded-[14px] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
          <Sparkles className="w-3 h-3" />
        </span>
        <h2
          id="newtab-quickstats"
          className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {t('newTab.quickStats.title')}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile icon={Tv} label={t('newTab.quickStats.episodes')} value={episodesWatched} />
        <StatTile
          icon={Library}
          label={t('newTab.quickStats.library')}
          value={libraryCount}
          tone="accent"
        />
        <StatTile
          icon={Flame}
          label={t('newTab.quickStats.streak')}
          value={t('newTab.quickStats.streakValue', { count: streakDays })}
          tone="gold"
        />
      </div>
    </section>
  );
});

interface StatTileProps {
  icon: typeof Tv;
  label: string;
  value: number | string;
  tone?: 'accent' | 'gold';
}

function StatTile({ icon: Icon, label, value, tone }: StatTileProps) {
  return (
    <div className="rounded-[10px] border border-border-glass bg-foreground/[0.04] px-3 py-3">
      <Icon
        className={cn(
          'w-3.5 h-3.5 mb-2',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-muted-foreground'
        )}
      />
      <div
        className={cn(
          'font-sans font-extrabold text-[20px] leading-[1.1] tracking-[-0.02em] tabular-nums',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </div>
    </div>
  );
}
