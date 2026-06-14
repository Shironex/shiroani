import { useTranslation } from 'react-i18next';
import { useTimetableView } from './TimetableView.hooks';
import { PosterGrid } from './TimetableView.parts';
import type { ITimetableViewProps } from './TimetableView.types';

/**
 * Poster board — 7 columns, one per day, each filled with cinematic poster
 * cards. Time and episode are rendered as floating mono pills on top of the
 * cover; title overlays the bottom via a dark gradient.
 *
 * Kept under the `timetable` view-mode id for store compatibility, but the
 * UI-facing label is "Plakaty" (posters).
 */
export default function TimetableView({
  weekDays,
  getEntriesForDay,
  schedule,
  onAnimeClick,
}: ITimetableViewProps) {
  const { t } = useTranslation('schedule');
  const { dayNamesShort, weekData, now } = useTimetableView({
    weekDays,
    getEntriesForDay,
    schedule,
  });

  return (
    <PosterGrid
      weekDays={weekDays}
      weekData={weekData}
      dayNamesShort={dayNamesShort}
      now={now}
      onAnimeClick={onAnimeClick}
      t={t}
    />
  );
}
