import type { IProfileExtraStatsProps, IProfileExtraStatsView } from './ProfileExtraStats.types';

export function useProfileExtraStats({
  stats,
}: Pick<IProfileExtraStatsProps, 'stats'>): IProfileExtraStatsView {
  const voiceActors = stats.voiceActors ?? [];
  const staff = stats.staff ?? [];
  const startYears = stats.startYears ?? [];
  const lengths = stats.lengths ?? [];

  const hasAny =
    voiceActors.length > 0 || staff.length > 0 || startYears.length > 0 || lengths.length > 0;

  return { voiceActors, staff, startYears, lengths, hasAny };
}
