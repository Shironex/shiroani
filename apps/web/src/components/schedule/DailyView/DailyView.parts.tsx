import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import type { AiringAnime } from '@shiroani/shared';
import { AiringEntry } from '../AiringEntry';
import { getSlotStatus } from '../schedule-utils';
import { HOUR_TOP_PAD, SLOT_GAP, SLOT_HEIGHT } from './DailyView.hooks';
import type { IHourBlock, IHourMark } from './DailyView.types';

/** Empty-state shown when the day has no airings. */
export function EmptyState() {
  const { t } = useTranslation('schedule');
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border-glass flex items-center justify-center">
        <Calendar className="w-6 h-6 opacity-30" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground/70">{t('daily.emptyTitle')}</p>
        <p className="text-xs text-muted-foreground/50">{t('daily.emptySubtitle')}</p>
      </div>
    </div>
  );
}

/** Left gutter time labels, absolutely positioned against the rail. */
export function HourGutter({ hourMarks }: { hourMarks: IHourMark[] }) {
  return (
    <div className="relative pr-2 pl-7">
      {hourMarks.map(m => (
        <span
          key={m.key}
          className={
            m.muted
              ? 'absolute font-mono text-[10px] tracking-[0.1em] text-muted-foreground/40'
              : 'absolute font-mono text-[10px] tracking-[0.1em] text-muted-foreground/70'
          }
          style={{ top: `${m.top}px`, right: '10px' }}
        >
          {m.label}
        </span>
      ))}
    </div>
  );
}

/** Per-block decorations — gridlines on hour blocks, dashed band on gap blocks. */
export function TimelineDecorations({ blocks }: { blocks: IHourBlock[] }) {
  const { t } = useTranslation('schedule');
  return (
    <>
      {blocks.map(b => {
        if (b.kind === 'gap') {
          return (
            <div
              key={`gap-${b.startHour}-${b.endHour}`}
              className="absolute left-0 right-0 flex items-center gap-3 pl-4 pr-2"
              style={{ top: `${b.top}px`, height: `${b.height}px` }}
              aria-hidden="true"
            >
              <div className="flex-1 border-t border-dashed border-border-glass/60" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/50 whitespace-nowrap">
                {t('daily.gapHours', { hours: b.endHour - b.startHour })}
              </span>
              <div className="flex-1 border-t border-dashed border-border-glass/60" />
            </div>
          );
        }
        return (
          <div
            key={`hr-${b.hour}`}
            aria-hidden="true"
            className="absolute left-0 right-0 h-px bg-border-glass/40"
            style={{ top: `${b.top}px` }}
          />
        );
      })}
    </>
  );
}

/** Live-now indicator line with marker glyph + time label. */
export function NowIndicator({ nowTop, nowLabel }: { nowTop: number; nowLabel: string }) {
  const { t } = useTranslation('schedule');
  return (
    <div
      role="presentation"
      aria-label={t('daily.nowLabel', { time: nowLabel })}
      className="absolute left-0 right-0 z-[3] pointer-events-none"
      style={{ top: `${nowTop}px`, height: '2px' }}
    >
      <div
        className="relative h-full bg-primary"
        style={{
          boxShadow: '0 0 14px oklch(from var(--primary) l c h / 0.6)',
        }}
      >
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary"
          style={{
            boxShadow: '0 0 16px oklch(from var(--primary) l c h / 0.9)',
          }}
        />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.18em] font-bold text-primary bg-background/90 px-1.5 py-[2px] rounded">
          {t('daily.nowMarker', { time: nowLabel })}
        </span>
      </div>
    </div>
  );
}

/** Slot cards — linearly stacked inside each content hour's block. */
export function SlotCards({
  blocks,
  now,
  onAnimeClick,
}: {
  blocks: IHourBlock[];
  now: number;
  onAnimeClick?: (anime: AiringAnime) => void;
}) {
  return (
    <>
      {blocks.map(b => {
        if (b.kind !== 'hour') return null;
        return b.slots.map((anime, idx) => {
          const top = b.top + HOUR_TOP_PAD + idx * (SLOT_HEIGHT + SLOT_GAP);
          const status = getSlotStatus(anime.airingAt, now);
          return (
            <AiringEntry
              key={`${anime.id}-${anime.episode}`}
              anime={anime}
              status={status}
              now={now}
              style={{
                position: 'absolute',
                top: `${top}px`,
                left: '32px',
                right: '8px',
                height: `${SLOT_HEIGHT}px`,
              }}
              onClick={onAnimeClick}
            />
          );
        });
      })}
    </>
  );
}

/** Fallback legend shown when today has no live airing right now. */
export function NoAiringsNow() {
  const { t } = useTranslation('schedule');
  return (
    <div className="absolute right-0 top-2 text-[10px] font-mono tracking-[0.1em] uppercase text-muted-foreground/60">
      {t('daily.noAiringsNow')}
    </div>
  );
}
