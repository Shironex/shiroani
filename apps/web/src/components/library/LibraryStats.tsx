import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Star, Tv, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { STATUS_CONFIG, STATUS_LABEL_KEY, STATUS_ORDER } from '@/lib/constants';
import { tDynamic } from '@/lib/i18n';
import type { AnimeStatus } from '@shiroani/shared';

export function LibraryStats() {
  const { t, i18n } = useTranslation(['library', 'status']);
  const entries = useLibraryStore(s => s.entries);

  const stats = useMemo(() => {
    const totalEntries = entries.length;

    const totalEpisodes = entries.reduce((sum, e) => sum + e.currentEpisode, 0);

    const breakdown: Record<AnimeStatus, number> = {
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      on_hold: 0,
      dropped: 0,
    };
    for (const entry of entries) {
      breakdown[entry.status]++;
    }

    const scored = entries.filter(e => e.score != null && e.score > 0);
    const avgScore =
      scored.length > 0 ? scored.reduce((sum, e) => sum + (e.score ?? 0), 0) / scored.length : 0;

    return { totalEntries, totalEpisodes, breakdown, avgScore, scoredCount: scored.length };
  }, [entries]);

  const hasEntries = stats.totalEntries > 0;

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
            {STATUS_ORDER.map(status => {
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
            })}
          </div>

          {/* Legend as inline chips */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map(status => {
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
                  <span
                    className="text-2xs font-semibold"
                    style={{ color: STATUS_CONFIG[status].cssColor }}
                  >
                    {count}
                  </span>
                  <span className="text-2xs text-muted-foreground/50">{percent}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type AccentType = 'primary' | 'info' | 'success' | 'warning';

const ACCENT_STYLES: Record<AccentType, { iconBg: string; iconColor: string; glowVar: string }> = {
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    glowVar: 'var(--primary)',
  },
  info: {
    iconBg: 'bg-status-info/10',
    iconColor: 'text-status-info',
    glowVar: 'var(--status-info)',
  },
  success: {
    iconBg: 'bg-status-success/10',
    iconColor: 'text-status-success',
    glowVar: 'var(--status-success)',
  },
  warning: {
    iconBg: 'bg-status-warning/10',
    iconColor: 'text-status-warning',
    glowVar: 'var(--status-warning)',
  },
};

function StatCard({
  icon,
  label,
  value,
  subtitle,
  accent = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: AccentType;
}) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-xl overflow-hidden',
        'bg-background/40 border border-border-glass',
        'backdrop-blur-sm',
        'transition-all duration-200',
        'hover:bg-background/60 hover:border-border-glass/80',
        'group'
      )}
    >
      {/* Subtle accent glow behind */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-[0.07] blur-xl transition-opacity duration-300 group-hover:opacity-[0.12]"
        style={{
          background: `radial-gradient(circle, ${styles.glowVar} 0%, transparent 70%)`,
        }}
      />

      {/* Icon */}
      <div
        className={cn(
          'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
          'transition-transform duration-200 group-hover:scale-105',
          styles.iconBg,
          styles.iconColor
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground leading-none tabular-nums tracking-tight">
            {value}
          </span>
        </div>
        <span className="text-2xs text-muted-foreground leading-tight block mt-0.5">{label}</span>
        {subtitle && (
          <span className="text-2xs text-muted-foreground/50 leading-tight block">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
