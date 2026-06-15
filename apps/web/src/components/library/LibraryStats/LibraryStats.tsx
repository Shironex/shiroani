import { useTranslation } from 'react-i18next';
import { Eye, Star, Tv, TrendingUp } from 'lucide-react';
import { STATUS_CONFIG, STATUS_LABEL_KEY, STATUS_ORDER } from '@/lib/constants';
import { tDynamic } from '@/lib/i18n';
import { useLibraryStats } from './LibraryStats.hooks';
import { StatCard } from './LibraryStats.parts';

export default function LibraryStats() {
  const { t, i18n } = useTranslation(['library', 'status']);
  const { stats, hasEntries } = useLibraryStats();

  // Segmented distribution bar — one rounded segment per non-empty status.
  const barSegments = STATUS_ORDER.map(status => {
    const count = stats.breakdown[status];
    if (count === 0) return null;
    const percent = (count / stats.totalEntries) * 100;
    return (
      <div
        key={status}
        className="h-full transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full"
        style={{
          width: `${percent}%`,
          backgroundColor: STATUS_CONFIG[status].cssColor,
          minWidth: count > 0 ? '6px' : 0,
        }}
        title={t('library:stats.tooltip', {
          label: tDynamic(i18n, `status:${STATUS_LABEL_KEY[status]}`),
          count,
          percent: Math.round(percent),
        })}
      />
    );
  });

  // Inline legend chips — one per non-empty status.
  const legendChips = STATUS_ORDER.map(status => {
    const count = stats.breakdown[status];
    if (count === 0) return null;
    const percent = Math.round((count / stats.totalEntries) * 100);
    return (
      <div
        key={status}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors"
        style={{ backgroundColor: STATUS_CONFIG[status].cssBgColor }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: STATUS_CONFIG[status].cssColor }}
        />
        <span className="text-2xs text-foreground/80 whitespace-nowrap">
          {tDynamic(i18n, `status:${STATUS_LABEL_KEY[status]}`)}
        </span>
        <span className="text-2xs font-semibold" style={{ color: STATUS_CONFIG[status].cssColor }}>
          {count}
        </span>
        <span className="text-2xs text-muted-foreground/50">{percent}%</span>
      </div>
    );
  });

  return (
    <div className="shrink-0 px-5 py-4 border-b border-border/50 bg-card/10 animate-slide-down space-y-4">
      {/* Stat cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={<Tv className="w-3.5 h-3.5" />}
          label={t('library:stats.total')}
          value={stats.totalEntries}
          accent="primary"
        />
        <StatCard
          icon={<Eye className="w-3.5 h-3.5" />}
          label={t('library:stats.episodes')}
          value={stats.totalEpisodes}
          accent="info"
        />
        <StatCard
          icon={<Star className="w-3.5 h-3.5" />}
          label={t('library:stats.avgScore')}
          value={stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '-'}
          subtitle={
            stats.scoredCount > 0
              ? t('library:stats.fromScored', { count: stats.scoredCount })
              : undefined
          }
          accent="warning"
        />
        <StatCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label={t('library:stats.watching')}
          value={stats.breakdown.watching}
          accent="success"
        />
      </div>

      {/* Status distribution */}
      {hasEntries && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('library:stats.distribution')}
            </p>
            <p className="text-2xs text-muted-foreground/60">
              {t('library:stats.entriesCount', { count: stats.totalEntries })}
            </p>
          </div>

          {/* Segmented bar with rounded segments */}
          <div className="flex h-2 rounded-full overflow-hidden gap-px bg-muted/30">
            {barSegments}
          </div>

          {/* Legend as inline chips */}
          <div className="flex flex-wrap gap-1.5">{legendChips}</div>
        </div>
      )}
    </div>
  );
}
