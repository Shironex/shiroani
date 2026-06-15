import type { ReactNode } from 'react';
import type { UserProfile } from '@shiroani/shared';

type Stats = UserProfile['statistics'];

export interface IProfileExtraStatsProps {
  stats: Stats;
  /** Render the shared section heading from the parent dashboard. */
  renderHead: (label: string) => ReactNode;
}

export interface IProfileExtraStatsView {
  readonly voiceActors: NonNullable<Stats['voiceActors']>;
  readonly staff: NonNullable<Stats['staff']>;
  readonly startYears: NonNullable<Stats['startYears']>;
  readonly lengths: NonNullable<Stats['lengths']>;
  readonly hasAny: boolean;
}
