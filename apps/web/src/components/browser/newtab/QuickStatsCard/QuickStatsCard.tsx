import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Tv, Library, Flame } from 'lucide-react';
import { PanelHeader } from '../PanelHeader';
import { useQuickStatsCard } from './QuickStatsCard.hooks';
import { StatTile } from './QuickStatsCard.parts';

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
function QuickStatsCard() {
  const { t } = useTranslation('browser');
  const { libraryCount, episodesWatched, streakDays } = useQuickStatsCard();

  return (
    <section
      aria-labelledby="newtab-quickstats"
      className="relative rounded-[calc(var(--radius)+4px)] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden"
    >
      <PanelHeader id="newtab-quickstats" icon={Sparkles} title={t('newTab.quickStats.title')} />

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
}

export default memo(QuickStatsCard);
