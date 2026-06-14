import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { useAiringTodaySection } from './AiringTodaySection.hooks';
import { AiringPosterCard, AiringSkeletonRow } from './AiringTodaySection.parts';
import type { IAiringTodaySectionProps } from './AiringTodaySection.types';

/** Airing Today section — horizontal scrolling poster cards */
export default function AiringTodaySection({ maxCards }: IAiringTodaySectionProps) {
  const { t } = useTranslation('browser');
  const { todayEntries, isLoading, navigateToSchedule, cards, hasMore } =
    useAiringTodaySection(maxCards);

  // Loading state
  if (!todayEntries && isLoading) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
            <CalendarDays className="w-3 h-3" />
          </span>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('newTab.airingToday.title')}
          </h2>
        </div>
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
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
          <CalendarDays className="w-3 h-3" />
        </span>
        <h2 className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('newTab.airingToday.title')}
        </h2>
        <button
          onClick={navigateToSchedule}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary/70 hover:text-primary transition-colors cursor-pointer"
        >
          {t('newTab.airingToday.viewAll')}
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {cardEls}

        {/* "More" card */}
        {hasMore && (
          <button
            onClick={navigateToSchedule}
            className="w-[100px] shrink-0 aspect-[3/4] rounded-lg border border-dashed border-border/40 hover:border-border/70 hover:bg-accent/20 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground/80"
          >
            <span className="text-lg">+</span>
            <span className="text-2xs">{t('newTab.airingToday.more')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
