export interface IRandomFiltersPanelProps {
  included: string[];
  excluded: string[];
  disabled: boolean;
  onChange: (included: string[], excluded: string[]) => void;
}

export interface IRandomFiltersPanelView {
  readonly open: boolean;
  readonly toggleOpen: () => void;
  readonly hasFilters: boolean;
  readonly hasIncluded: boolean;
  readonly hasExcluded: boolean;
  readonly showSeparator: boolean;
}
