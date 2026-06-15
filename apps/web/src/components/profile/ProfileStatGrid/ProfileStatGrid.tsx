import { useTranslation } from 'react-i18next';
import { useProfileStatGrid } from './ProfileStatGrid.hooks';
import { StatCard } from './ProfileStatGrid.parts';
import type { IProfileStatGridProps } from './ProfileStatGrid.types';

/**
 * 4-up stat grid shown at the top of the Profile main column. Renders the
 * key "COMPLETED / WATCHING / PLANNING / MEAN SCORE" summary cards from the
 * mock's `.stats-row`.
 */
export default function ProfileStatGrid({ profile }: IProfileStatGridProps) {
  const { t } = useTranslation('profile');
  const { completed, current, planning, meanScore } = useProfileStatGrid({ profile });

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
        value={meanScore}
        sub={t('stats.meanScoreSub')}
        tone="gold"
      />
    </div>
  );
}
