import { useTranslation } from 'react-i18next';
import { useWeeklyView } from './WeeklyView.hooks';
import { WeekColumns } from './WeeklyView.parts';
import type { IWeeklyViewProps } from './WeeklyView.types';

/**
 * Compact 7-column week grid — one column per weekday, event cards stacked
 * vertically within each. Status is encoded as a coloured left border
 * (accent = live, green = soon/sub, violet = upcoming, muted = done).
 */
export default function WeeklyView({
  weekDays,
  getEntriesForDay,
  schedule,
  onAnimeClick,
  libraryAnilistIds,
  subscribedAnilistIds,
}: IWeeklyViewProps) {
  const { t } = useTranslation('schedule');
  const { dayNamesShort, weekData, now } = useWeeklyView({
    weekDays,
    getEntriesForDay,
    schedule,
  });

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden [mask-image:linear-gradient(to_right,#000_calc(100%_-_40px),transparent_100%)]">
      <WeekColumns
        weekDays={weekDays}
        dayNamesShort={dayNamesShort}
        weekData={weekData}
        now={now}
        onAnimeClick={onAnimeClick}
        libraryAnilistIds={libraryAnilistIds}
        subscribedAnilistIds={subscribedAnilistIds}
        emptyLabel={t('weekly.emptyLabel')}
        nowLabel={t('weekly.now')}
        episodeLabelFor={anime => t('timetable.episodeShort', { episode: anime.episode })}
      />
    </div>
  );
}
