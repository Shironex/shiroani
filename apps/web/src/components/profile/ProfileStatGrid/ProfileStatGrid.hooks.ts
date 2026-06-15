import { formatScoreOutOf10 } from '../profile-constants';
import type { IProfileStatGridProps, IProfileStatGridView } from './ProfileStatGrid.types';

export function useProfileStatGrid({ profile }: IProfileStatGridProps): IProfileStatGridView {
  const { statistics: stats } = profile;

  const byStatus = new Map(stats.statuses.map(s => [s.name, s.count]));
  const completed = byStatus.get('COMPLETED') ?? 0;
  const current = byStatus.get('CURRENT') ?? 0;
  const planning = byStatus.get('PLANNING') ?? 0;
  const meanScore = formatScoreOutOf10(stats.meanScore);

  return { completed, current, planning, meanScore };
}
