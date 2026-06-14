import type { FrequentSite } from '@shiroani/shared';

export interface IFrequentSiteRowProps {
  site: FrequentSite;
  onClick: () => void;
}

export interface IFrequentSiteRowView {
  readonly imgError: boolean;
  readonly setImgError: (value: boolean) => void;
  readonly host: string;
  readonly relative: string;
}
