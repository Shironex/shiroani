import type {
  DiscoverAiringStatus,
  DiscoverFilters,
  DiscoverFormat,
  DiscoverSeason,
} from '@shiroani/shared';

export interface IDiscoverFiltersPanelProps {
  filters: DiscoverFilters;
  disabled: boolean;
  /**
   * Whether the AniList account is connected. Gates the "haven't seen" toggle
   * (item C4) — `excludeOnList` is meaningless without a list to exclude.
   */
  connected: boolean;
  onChange: (filters: DiscoverFilters) => void;
}

export interface IFacetSelectProps {
  label: string;
  any: string;
  value: string | undefined;
  options: readonly string[];
  labelOf: (value: string) => string;
  disabled: boolean;
  onChange: (value: string | undefined) => void;
}

export interface IDiscoverFiltersPanelView {
  readonly open: boolean;
  readonly toggleOpen: () => void;
  readonly tagDraft: string;
  readonly setTagDraft: (value: string) => void;
  readonly activeCount: number;
  readonly hasActive: boolean;
  readonly localScore: [number, number];
  readonly years: string[];
  readonly patch: (next: Partial<DiscoverFilters>) => void;
  readonly handleGenres: (included: string[], excluded: string[]) => void;
  readonly handleScoreChange: (val: number[]) => void;
  readonly handleScoreCommit: (range: number[]) => void;
  readonly addTag: () => void;
  readonly removeTag: (tag: string) => void;
  readonly handleStatusChange: (v: string | undefined) => void;
  readonly handleFormatChange: (v: string | undefined) => void;
  readonly handleSeasonChange: (v: string | undefined) => void;
  readonly handleYearChange: (v: string | undefined) => void;
}

export type { DiscoverAiringStatus, DiscoverFormat, DiscoverSeason };
