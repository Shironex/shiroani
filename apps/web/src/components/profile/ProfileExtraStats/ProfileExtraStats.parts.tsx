import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { IProfileExtraStatsView } from './ProfileExtraStats.types';

const BAR_COLOURS = [
  'oklch(0.74 0.15 355)',
  'oklch(0.7 0.15 280)',
  'oklch(0.7 0.15 30)',
  'oklch(0.78 0.15 140)',
  'oklch(0.7 0.15 220)',
];

interface CountItem {
  key: string;
  label: string;
  count: number;
}

/**
 * Ordered horizontal-bar breakdown keyed on a raw count. Mirrors
 * {@link GenreBreakdown}'s `.genre-bar` stack (label + percentage, 5px pill bar
 * underneath) but generalised over any `{ label, count }` series.
 *
 * By default rows are ranked by count (descending). Pass `preserveOrder` to keep
 * the caller's incoming order instead — e.g. a chronological start-year timeline.
 */
function CountBreakdown({
  items,
  limit = 5,
  preserveOrder = false,
}: {
  items: CountItem[];
  limit?: number;
  preserveOrder?: boolean;
}) {
  const top = (preserveOrder ? items : [...items].sort((a, b) => b.count - a.count)).slice(
    0,
    limit
  );
  const max = Math.max(...top.map(i => i.count), 1);

  return (
    <div className="flex flex-col gap-2">
      {top.map((item, i) => {
        const pct = Math.round((item.count / max) * 100);
        const color = BAR_COLOURS[i % BAR_COLOURS.length];
        return (
          <div key={item.key}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11.5px] font-medium text-foreground/90 truncate">
                {item.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {item.count}
              </span>
            </div>
            <div className="h-[5px] rounded-[3px] bg-foreground/7 overflow-hidden">
              <div
                className="h-full rounded-[3px] transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ExtraStatsGridProps extends IProfileExtraStatsView {
  renderHead: (label: string) => ReactNode;
}

/** The four optional richer-stats blocks (voice actors / staff / years / lengths). */
export function ExtraStatsGrid({
  voiceActors,
  staff,
  startYears,
  lengths,
  renderHead,
}: ExtraStatsGridProps) {
  const { t } = useTranslation('profile');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
      {voiceActors.length > 0 && (
        <section>
          {renderHead(t('extraStats.voiceActors'))}
          <CountBreakdown
            items={voiceActors.map(v => ({ key: v.name, label: v.name, count: v.count }))}
          />
        </section>
      )}

      {staff.length > 0 && (
        <section>
          {renderHead(t('extraStats.staff'))}
          <CountBreakdown
            items={staff.map(s => ({ key: s.name, label: s.name, count: s.count }))}
          />
        </section>
      )}

      {startYears.length > 0 && (
        <section>
          {renderHead(t('extraStats.startYears'))}
          {/* Chronological (newest-first) rather than ranked-by-count, so the
              bars read as a start-year timeline. */}
          <CountBreakdown
            preserveOrder
            items={[...startYears]
              .sort((a, b) => b.value - a.value)
              .map(y => ({ key: String(y.value), label: String(y.value), count: y.count }))}
          />
        </section>
      )}

      {lengths.length > 0 && (
        <section>
          {renderHead(t('extraStats.lengths'))}
          <CountBreakdown
            items={lengths.map(l => ({
              key: l.value,
              label: t('extraStats.lengthLabel', { value: l.value }),
              count: l.count,
            }))}
          />
        </section>
      )}
    </div>
  );
}
