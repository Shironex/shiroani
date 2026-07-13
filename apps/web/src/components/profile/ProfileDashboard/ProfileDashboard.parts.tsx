import { useTranslation, Trans } from 'react-i18next';
import type { UserProfile } from '@shiroani/shared';
import { ProgressRing } from '../ProgressRing';
import { useStatusLabels, formatDays, useDaysLabel, formatCount } from '../profile-constants';
import type { IStatusRing, ITopYear } from './ProfileDashboard.types';

interface LibraryBreakdownProps {
  statusRings: IStatusRing[];
  stats: UserProfile['statistics'];
  topYear: ITopYear | null;
}

/**
 * Library status rings + the prose summary column (episodes watched, screen
 * time and favourite year). Kept in parts so the `.map` over rings and the
 * `Trans` interpolation stay out of the thin shell.
 */
export function LibraryBreakdown({ statusRings, stats, topYear }: LibraryBreakdownProps) {
  const { t, i18n } = useTranslation('profile');
  const STATUS_LABELS = useStatusLabels();
  const daysLabel = useDaysLabel();

  return (
    <div className="flex gap-5 items-center flex-wrap">
      {statusRings.map(ring => (
        <ProgressRing
          key={ring.name}
          value={ring.pct}
          stroke={ring.color}
          label={STATUS_LABELS[ring.name] ?? ring.name}
          valueLabel={`${Math.round(ring.pct)}%`}
        />
      ))}
      <div className="flex-1 min-w-[220px] px-3.5 text-xs text-foreground/75 leading-[1.6] space-y-1">
        <div>
          <Trans
            i18nKey="dashboard.summary.watched"
            t={t}
            values={{
              episodes: formatCount(stats.episodesWatched, i18n.language),
            }}
            components={{ 1: <b className="text-foreground font-bold tabular-nums" /> }}
          />
        </div>
        <div>
          <Trans
            i18nKey="dashboard.summary.screenTime"
            t={t}
            values={{
              value: formatDays(stats.minutesWatched),
              unit: daysLabel(stats.minutesWatched),
            }}
            components={{
              1: <b className="text-gold font-bold tabular-nums" />,
            }}
          />
        </div>
        {topYear && (
          <div>
            <Trans
              i18nKey="dashboard.summary.favoriteYear"
              t={t}
              values={{
                year: topYear.year,
                count: topYear.count,
                titles: t('dashboard.titles', { count: topYear.count }),
              }}
              components={{ 1: <b className="text-primary font-bold tabular-nums" /> }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
