import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { isToday, getDayNumber } from './schedule-utils';

export interface DayColumnHeaderProps {
  day: string;
  label: string;
  entryCount: number;
}

/**
 * Editorial day-column header. Mono uppercase label above a large serif
 * date, with an optional count badge below. Today's column lights up in
 * the accent colour.
 */
export function DayColumnHeader({ day, label, entryCount }: DayColumnHeaderProps) {
  const { t } = useTranslation('schedule');
  const isTodayDay = isToday(day);

  return (
    <div
      className={cn(
        'sticky top-0 z-10 shrink-0 px-3 py-3 text-center border-b border-border-glass backdrop-blur-sm',
        isTodayDay ? 'bg-primary/10' : 'bg-card/20'
      )}
    >
      <span
        className={cn(
          'block font-mono text-[10px] uppercase tracking-[0.2em]',
          isTodayDay ? 'text-primary font-bold' : 'text-muted-foreground'
        )}
      >
        {isTodayDay ? `${label} · ${t('weekday.todaySuffix')}` : label}
      </span>
      <div
        className={cn(
          'mt-1 font-serif text-[24px] font-extrabold leading-none tabular-nums',
          isTodayDay ? 'text-primary' : 'text-foreground'
        )}
      >
        {getDayNumber(day)}
      </div>
      {entryCount > 0 && (
        <div className="mt-[3px] text-[10px] font-mono tracking-[0.04em] text-muted-foreground/70">
          {entryCount} {t('dialog.episodesShort')}
        </div>
      )}
    </div>
  );
}
