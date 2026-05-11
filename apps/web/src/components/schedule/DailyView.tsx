import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { AiringEntry } from './AiringEntry';
import { getSlotStatus, isToday as isTodayFn } from './schedule-utils';
import { useNowSeconds } from '@/hooks/useNowSeconds';
import type { AiringAnime } from '@shiroani/shared';

export interface DailyViewProps {
  entries: AiringAnime[];
  /** YYYY-MM-DD — the day being rendered (drives the "is today" check) */
  day: string;
  onAnimeClick?: (anime: AiringAnime) => void;
}

// ─── Layout constants ─────────────────────────────────────────────
/** Pixel height of an empty hour row (no episode airs). */
const HOUR_HEIGHT_BASE = 56;
/** Rendered height of an `AiringEntry` card. */
const SLOT_HEIGHT = 54;
/** Vertical gap between two stacked slots inside the same hour. */
const SLOT_GAP = 6;
/** Padding above the first slot inside a content hour. */
const HOUR_TOP_PAD = 4;
/** Padding below the last slot inside a content hour. */
const HOUR_BOTTOM_PAD = 4;
/** Collapsed visual height of a long empty stretch (≥ 3 consecutive hours). */
const GAP_HEIGHT = 44;
/** Empty runs longer than this collapse into a single gap marker. */
const EMPTY_COLLAPSE_THRESHOLD = 2;
/** Top padding inside the timeline so the first hour label has breathing room. */
const TIMELINE_TOP_PAD = 12;

/**
 * Per-hour layout block describing either an hour's worth of content or a
 * coalesced empty stretch ("Xh ciszy"). We pre-compute these so slot positions
 * and the live-now indicator stay consistent across the whole rail.
 */
interface HourBlockContent {
  kind: 'hour';
  /** Hour index relative to dayStart (0–29, can overflow past 24 for cross-midnight airings). */
  hour: number;
  top: number;
  height: number;
  slots: AiringAnime[];
}

interface HourBlockGap {
  kind: 'gap';
  startHour: number;
  endHour: number;
  top: number;
  height: number;
}

type HourBlock = HourBlockContent | HourBlockGap;

function hoursFromTimestamp(timestamp: number, dayStart: Date): number {
  const d = new Date(timestamp * 1000);
  return (d.getTime() - dayStart.getTime()) / 3_600_000;
}

function formatHourLabel(h: number): string {
  const wrapped = ((h % 24) + 24) % 24;
  return `${String(wrapped).padStart(2, '0')}:00`;
}

/**
 * Adaptive vertical hour-axis timeline for a single day.
 *
 * Layout algorithm:
 *   - Walk every hour in the visible window [windowStart, windowEnd).
 *   - Group airings by their floor-hour.
 *   - Content hours get as much height as they need (one slot ≈ 64 px, two
 *     slots ≈ 124 px, …) so clusters never overlap and never drift away from
 *     their hour label.
 *   - Empty stretches of 3+ hours collapse into a single "Xh ciszy" marker
 *     so sparse days (04:00 … 14:55) don't waste a screen of blank rail.
 *
 * Live-now indicator maps `nowHours` through the same block list so it lands
 * on the correct y even when the axis is non-uniform.
 */
export function DailyView({ entries, day, onAnimeClick }: DailyViewProps) {
  const { t, i18n } = useTranslation('schedule');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // 30 s cadence keeps the live-now line and countdowns fresh.
  const now = useNowSeconds(30_000);
  const [didInitialScroll, setDidInitialScroll] = useState(false);

  // Reset the auto-scroll flag whenever the day changes so we re-center once
  // the new day's entries arrive.
  useEffect(() => {
    setDidInitialScroll(false);
  }, [day]);

  // Derive the day's start (local midnight) from the YYYY-MM-DD string so we
  // render slots at the correct hour offsets regardless of DST boundaries.
  const dayStart = useMemo(() => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }, [day]);

  const isToday = isTodayFn(day);

  // Compute the visible hour window — clamp to the earliest / latest slot so
  // we don't scroll through empty midnight hours when the first airing is at
  // 22:00. Tight pad (1 h before, 2 h after) — gap-collapse handles any long
  // emptiness inside the window.
  const { windowStart, windowEnd } = useMemo(() => {
    if (entries.length === 0) return { windowStart: 12, windowEnd: 26 };
    let min = 24;
    let max = 0;
    for (const e of entries) {
      const h = hoursFromTimestamp(e.airingAt, dayStart);
      if (h < min) min = h;
      if (h > max) max = h;
    }
    const s = Math.max(0, Math.floor(min - 1));
    const e = Math.min(30, Math.ceil(max + 2));
    return { windowStart: s, windowEnd: Math.max(e, s + 4) };
  }, [entries, dayStart]);

  // Build hour blocks + coalesce long empty runs.
  const { blocks, railHeight } = useMemo(() => {
    const byHour = new Map<number, AiringAnime[]>();
    for (const e of entries) {
      const h = hoursFromTimestamp(e.airingAt, dayStart);
      const hr = Math.floor(h);
      const arr = byHour.get(hr) ?? [];
      arr.push(e);
      byHour.set(hr, arr);
    }
    byHour.forEach(arr => arr.sort((a, b) => a.airingAt - b.airingAt));

    const list: HourBlock[] = [];
    let emptyStart: number | null = null;

    const flushEmpty = (end: number) => {
      if (emptyStart === null) return;
      const run = end - emptyStart;
      if (run > EMPTY_COLLAPSE_THRESHOLD) {
        list.push({
          kind: 'gap',
          startHour: emptyStart,
          endHour: end,
          top: 0,
          height: GAP_HEIGHT,
        });
      } else {
        for (let h = emptyStart; h < end; h++) {
          list.push({ kind: 'hour', hour: h, top: 0, height: HOUR_HEIGHT_BASE, slots: [] });
        }
      }
      emptyStart = null;
    };

    for (let h = windowStart; h < windowEnd; h++) {
      const slots = byHour.get(h);
      if (!slots || slots.length === 0) {
        if (emptyStart === null) emptyStart = h;
        continue;
      }
      flushEmpty(h);
      const slotsHeight =
        HOUR_TOP_PAD + slots.length * SLOT_HEIGHT + (slots.length - 1) * SLOT_GAP + HOUR_BOTTOM_PAD;
      list.push({
        kind: 'hour',
        hour: h,
        top: 0,
        height: Math.max(HOUR_HEIGHT_BASE, slotsHeight),
        slots,
      });
    }
    flushEmpty(windowEnd);

    let y = TIMELINE_TOP_PAD;
    for (const b of list) {
      b.top = y;
      y += b.height;
    }

    return { blocks: list, railHeight: y + 16 };
  }, [entries, dayStart, windowStart, windowEnd]);

  // Gutter labels — every even hour plus any hour that holds content, so the
  // user always has a time anchor near every slot.
  const hourMarks = useMemo(() => {
    const marks: { key: string; top: number; label: string; muted: boolean }[] = [];
    for (const b of blocks) {
      if (b.kind === 'hour') {
        const hasContent = b.slots.length > 0;
        if (!hasContent && b.hour % 2 !== 0) continue;
        marks.push({
          key: `h-${b.hour}`,
          top: b.top - 6,
          label: formatHourLabel(b.hour),
          muted: !hasContent,
        });
      }
    }
    return marks;
  }, [blocks]);

  /**
   * Map a fractional hour (relative to dayStart) to a y coordinate in the
   * rail. Linearly interpolates inside the matching block — content blocks
   * keep slot-level fidelity, gap blocks treat the whole compressed stretch
   * as a single band.
   */
  const hourToY = (hours: number): number | null => {
    if (blocks.length === 0) return null;
    for (const b of blocks) {
      const bStart = b.kind === 'hour' ? b.hour : b.startHour;
      const bEnd = b.kind === 'hour' ? b.hour + 1 : b.endHour;
      if (hours >= bStart && hours < bEnd) {
        const frac = (hours - bStart) / (bEnd - bStart);
        return b.top + frac * b.height;
      }
    }
    return null;
  };

  const nowHours = useMemo(() => {
    if (!isToday) return null;
    const secondsFromStart = now - Math.floor(dayStart.getTime() / 1000);
    const h = secondsFromStart / 3600;
    if (h < windowStart - 0.1 || h >= windowEnd + 0.1) return null;
    return h;
  }, [isToday, now, dayStart, windowStart, windowEnd]);

  const nowTop = nowHours != null ? hourToY(nowHours) : null;
  const nowLabel = useMemo(() => {
    if (!isToday) return '';
    // `now` is in deps via the closure — reading Date.now() inside keeps the
    // label fresh on every 30 s tick without needing an extra memo input.
    void now;
    return new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  }, [isToday, now, i18n.language]);

  // Auto-scroll once per day, as soon as entries are ready — the live-now
  // indicator (or the first slot) comes into view without the user chasing it.
  useEffect(() => {
    if (didInitialScroll) return;
    if (!scrollRef.current) return;
    if (entries.length === 0) return;
    const target = nowTop != null ? nowTop - 140 : 0;
    scrollRef.current.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
    setDidInitialScroll(true);
  }, [didInitialScroll, entries.length, nowTop]);

  // Empty state
  if (entries.length === 0) {
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

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: '64px 1fr',
          height: `${railHeight}px`,
          paddingBottom: '96px',
        }}
      >
        {/* Hour gutter */}
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

        {/* Timeline column */}
        <div className="relative pr-7 pl-2">
          {/* Vertical rule */}
          <div aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-px bg-border-glass" />

          {/* Per-block decorations — gridlines on hour blocks, dashed band on gap blocks */}
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

          {/* Live-now indicator */}
          {nowTop != null && (
            <div
              role="presentation"
              aria-label={t('daily.nowLabel', { time: nowLabel })}
              className="absolute left-0 right-0 z-[3] pointer-events-none"
              style={{ top: `${nowTop}px`, height: '2px' }}
            >
              <div
                className="relative h-full bg-primary animate-pulse"
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
                <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.16em] font-bold text-primary bg-background/90 px-1.5 py-[2px] rounded">
                  {t('daily.nowMarker', { time: nowLabel })}
                </span>
              </div>
            </div>
          )}

          {/* Slot cards — linearly stacked inside each content hour's block. */}
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

          {/* Legend fallback if nothing is live right now. */}
          {isToday && nowTop == null && (
            <div className="absolute right-0 top-2 text-[10px] font-mono tracking-[0.12em] uppercase text-muted-foreground/60">
              {t('daily.noAiringsNow')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Re-exported for tests / debugging — legacy name kept stable.
export { HOUR_HEIGHT_BASE as HOUR_HEIGHT };
