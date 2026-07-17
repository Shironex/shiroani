import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import type { AiringAnime } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { getSlotStatus, type SlotStatus } from '../schedule-utils';

interface IDayColumnCardListProps {
  /** Airing entries for this day, already sorted by the caller. */
  entries: AiringAnime[];
  /** Current epoch seconds — used to derive each entry's slot status. */
  now: number;
  /** Renders a single card. Receives the entry + its live/soon/done status. */
  renderCard: (anime: AiringAnime, status: SlotStatus) => ReactNode;
  /** Copy shown inside the empty-state when the day has no entries. */
  emptyLabel: string;
  /** Extra classes for the empty-state wrapper — controls vertical padding. */
  emptyStateClassName?: string;
  /** Icon-size class for the empty-state `Calendar` glyph. */
  emptyIconClassName?: string;
}

/**
 * Presentational scroll-list body for a schedule day column. Owns the
 * per-entry slot-status derivation and the empty-state fallback so the
 * shell stays free of in-JSX iteration.
 */
export function DayColumnCardList({
  entries,
  now,
  renderCard,
  emptyLabel,
  emptyStateClassName = 'py-6',
  emptyIconClassName = 'w-5 h-5',
}: IDayColumnCardListProps) {
  return (
    <>
      {entries.map(anime => {
        const status = getSlotStatus(anime.airingAt, now);
        return renderCard(anime, status);
      })}
      {entries.length === 0 && (
        <div className={cn('flex flex-col items-center justify-center', emptyStateClassName)}>
          <Calendar className={cn('mb-1 text-muted-foreground/40', emptyIconClassName)} />
          <p className="text-[10.5px] font-mono tracking-[0.1em] uppercase text-muted-foreground/55">
            {emptyLabel}
          </p>
        </div>
      )}
    </>
  );
}
