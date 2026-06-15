import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { isToday, getDayNumber } from '../schedule-utils';
import type { IDayColumnHeaderProps } from './DayColumnHeader.types';

/**
 * Editorial day-column header. Mono uppercase label above a large serif
 * date, with an optional count badge below. Today's column lights up in
 * the accent colour.
 */
export default function DayColumnHeader({ day, label, entryCount }: IDayColumnHeaderProps) {
  const { t } = useTranslation('schedule');
  const isTodayDay = isToday(day);

  return (
    <div
      className={cn(
        // No backdrop-blur here: this header repeats ×7 (one per day column) and
        // is sticky, so a backdrop-filter would promote 7 always-on compositor
        // layers + backdrop captures — in the poster grid (full-bleed covers) on
        // a fullscreen Retina viewport that overruns Chromium's raster-tile
        // budget and the view flickers. An opaque/near-opaque background occludes
        // the scrolling cards underneath for free. See feedback_gpu_layers.
        'sticky top-0 z-10 shrink-0 px-3 py-3 text-center border-b border-border-glass',
        isTodayDay ? 'bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))]' : 'bg-card/85'
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
