import { useMemo } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import type {
  IProfileDashboardProps,
  IProfileDashboardView,
  IStatusRing,
} from './ProfileDashboard.types';

// Status rings map to the semantic status palette (info/success/warning/error);
// PAUSED has no status token, so it borrows the categorical chart-5 hue.
const RING_DEFS: Array<{ name: string; color: string }> = [
  { name: 'COMPLETED', color: 'var(--status-success)' },
  { name: 'CURRENT', color: 'var(--status-info)' },
  { name: 'PLANNING', color: 'var(--status-warning)' },
  { name: 'PAUSED', color: 'var(--chart-5)' },
  { name: 'DROPPED', color: 'var(--status-error)' },
];

export function useProfileDashboard({
  profile,
}: Pick<IProfileDashboardProps, 'profile'>): IProfileDashboardView {
  const { statistics: stats } = profile;
  const isLoading = useProfileStore(s => s.isLoading);

  const totalStatusCount = useMemo(
    () => stats.statuses.reduce((sum, s) => sum + s.count, 0) || 1,
    [stats.statuses]
  );

  const statusRings = useMemo<IStatusRing[]>(() => {
    // Preserve the mock's ring order regardless of backend order.
    const byName = new Map(stats.statuses.map(s => [s.name, s.count]));
    return RING_DEFS.map(def => ({
      ...def,
      count: byName.get(def.name) ?? 0,
      pct: ((byName.get(def.name) ?? 0) / totalStatusCount) * 100,
    }));
  }, [stats.statuses, totalStatusCount]);

  const topYear = useMemo(() => {
    if (stats.releaseYears.length === 0) return null;
    return [...stats.releaseYears].sort((a, b) => b.count - a.count)[0];
  }, [stats.releaseYears]);

  return { stats, isLoading, statusRings, topYear };
}
