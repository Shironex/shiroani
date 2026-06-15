import { useMemo } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import type {
  IProfileDashboardProps,
  IProfileDashboardView,
  IStatusRing,
} from './ProfileDashboard.types';

const RING_DEFS: Array<{ name: string; color: string }> = [
  { name: 'COMPLETED', color: 'oklch(0.74 0.15 355)' },
  { name: 'CURRENT', color: 'oklch(0.7 0.15 220)' },
  { name: 'PLANNING', color: 'oklch(0.8 0.14 70)' },
  { name: 'PAUSED', color: 'oklch(0.6 0.05 298)' },
  { name: 'DROPPED', color: 'oklch(0.65 0.18 25)' },
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
