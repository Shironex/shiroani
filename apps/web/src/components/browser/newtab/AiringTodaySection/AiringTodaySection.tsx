import { useTranslation } from 'react-i18next';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { PanelHeader } from '../PanelHeader';
import { useAiringTodaySection } from './AiringTodaySection.hooks';
import { AiringPosterCard, AiringSkeletonRow } from './AiringTodaySection.parts';
import type { IAiringTodaySectionProps } from './AiringTodaySection.types';

/** Airing Today section — horizontal scrolling poster cards */
export default function AiringTodaySection({ maxCards }: IAiringTodaySectionProps) {
  const { t } = useTranslation('browser');
  const { todayEntries, isLoading, navigateToSchedule, cards } = useAiringTodaySection(maxCards);

  // Loading state
  if (!todayEntries && isLoading) {
    return (
      <div>
        <PanelHeader id="newtab-airing" icon={CalendarDays} title={t('newTab.airingToday.title')} />
        <AiringSkeletonRow />
      </div>
    );
  }

  // Empty state
  if (!todayEntries || todayEntries.length === 0) return null;

  const cardEls = cards.map(entry => (
    <AiringPosterCard key={entry.id} entry={entry} isUser={entry.isUser} />
  ));

  return (
    <div>
      <PanelHeader
        id="newtab-airing"
        icon={CalendarDays}
        title={t('newTab.airingToday.title')}
        action={
          <button
            onClick={navigateToSchedule}
            className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-[0.18em] text-primary/70 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t('newTab.airingToday.viewAll')}
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      />

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">{cardEls}</div>
    </div>
  );
}
