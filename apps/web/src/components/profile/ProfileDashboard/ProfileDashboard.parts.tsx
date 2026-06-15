import { useTranslation, Trans } from 'react-i18next';
import type { UserProfile } from '@shiroani/shared';
import { ProgressRing } from '../ProgressRing';
import { useStatusLabels, formatDays, formatDaysLabel } from '../profile-constants';
import type { IStatusRing, ITopYear } from './ProfileDashboard.types';

export function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2.5 mb-3">
      <span>{children}</span>
      <span aria-hidden="true" className="flex-1 h-px bg-border-glass" />
    </h3>
  );
}

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
      <div className="flex-1 min-w-[220px] px-3.5 text-[12px] text-foreground/75 leading-[1.6] space-y-1">
        <div>
          <Trans
            i18nKey="dashboard.summary.watched"
            t={t}
            values={{
              episodes: stats.episodesWatched.toLocaleString(i18n.language).replace(/,/g, ' '),
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
              unit: formatDaysLabel(stats.minutesWatched),
            }}
            components={{
              1: <b className="text-[oklch(0.8_0.14_70)] font-bold tabular-nums" />,
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
