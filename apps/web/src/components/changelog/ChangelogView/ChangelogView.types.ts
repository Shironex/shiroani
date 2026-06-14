import type { ChangelogRelease, ChangelogReleaseType } from '@/lib/changelog-entries';

export type FilterValue = 'all' | ChangelogReleaseType;

export interface IChangelogFilterChip {
  readonly value: FilterValue;
  readonly label: string;
  readonly count: number;
}

export interface IChangelogViewProps {
  /**
   * Skip outer chrome (kanji watermark, tall header padding) — used when the
   * view is embedded inside a narrower container.
   */
  readonly compact?: boolean;
  /** Optional className for the root. */
  readonly className?: string;
}

export interface IChangelogView {
  readonly filter: FilterValue;
  readonly onFilterChange: (filter: FilterValue) => void;
  readonly filters: IChangelogFilterChip[];
  readonly jumpTargets: ChangelogRelease[];
  readonly latest: ChangelogRelease;
  readonly visible: ChangelogRelease[];
  /** The closing dashed "origin" marker shows only on the unfiltered list. */
  readonly showOrigin: boolean;
}
