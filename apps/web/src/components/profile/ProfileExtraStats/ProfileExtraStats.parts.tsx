import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CountBars, type ICountBarRow } from '../shared-parts';
import { formatCount } from '../profile-constants';
import type { IProfileExtraStatsView } from './ProfileExtraStats.types';

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
  locale,
  limit = 5,
  preserveOrder = false,
}: {
  items: CountItem[];
  locale: string;
  limit?: number;
  preserveOrder?: boolean;
}) {
  const top = (preserveOrder ? items : [...items].sort((a, b) => b.count - a.count)).slice(
    0,
    limit
  );
  const max = Math.max(...top.map(i => i.count), 1);

  const rows: ICountBarRow[] = top.map(item => ({
    key: item.key,
    label: item.label,
    valueLabel: formatCount(item.count, locale),
    pct: Math.round((item.count / max) * 100),
  }));

  return <CountBars rows={rows} />;
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
  const { t, i18n } = useTranslation('profile');
  const locale = i18n.language;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
      {voiceActors.length > 0 && (
        <section>
          {renderHead(t('extraStats.voiceActors'))}
          <CountBreakdown
            locale={locale}
            items={voiceActors.map(v => ({ key: v.name, label: v.name, count: v.count }))}
          />
        </section>
      )}

      {staff.length > 0 && (
        <section>
          {renderHead(t('extraStats.staff'))}
          <CountBreakdown
            locale={locale}
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
            locale={locale}
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
            locale={locale}
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
