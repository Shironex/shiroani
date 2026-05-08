import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@shiroani/shared';
import { formatScore } from './profile-constants';

interface ProfileStatGridProps {
  profile: UserProfile;
}

/**
 * 4-up stat grid shown at the top of the Profile main column. Renders the
 * key "COMPLETED / WATCHING / PLANNING / MEAN SCORE" summary cards from the
 * mock's `.stats-row`.
 */
export function ProfileStatGrid({ profile }: ProfileStatGridProps) {
  const { t } = useTranslation('profile');
  const { statistics: stats } = profile;

  const byStatus = new Map(stats.statuses.map(s => [s.name, s.count]));
  const completed = byStatus.get('COMPLETED') ?? 0;
  const current = byStatus.get('CURRENT') ?? 0;
  const planning = byStatus.get('PLANNING') ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label={t('stats.completed')}
        value={completed}
        sub={t('stats.completedSub')}
        tone="accent"
      />
      <StatCard label={t('stats.current')} value={current} sub={t('stats.currentSub')} />
      <StatCard label={t('stats.planning')} value={planning} sub={t('stats.planningSub')} />
      <StatCard
        label={t('stats.meanScore')}
        value={formatScore(stats.meanScore)}
        sub={t('stats.meanScoreSub')}
        tone="gold"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'accent' | 'gold';
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl bg-foreground/[0.025] border border-border-glass">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          'font-sans font-extrabold text-[28px] tracking-[-0.03em] leading-none tabular-nums',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-muted-foreground/80 mt-1">{sub}</div>}
    </div>
  );
}
