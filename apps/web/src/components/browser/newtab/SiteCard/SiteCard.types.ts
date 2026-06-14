import type { QuickAccessSite } from '@shiroani/shared';

export interface ISiteCardProps {
  site: QuickAccessSite;
  onClick: () => void;
  onRemove: () => void;
}

export interface ISiteCardView {
  readonly faviconError: boolean;
  readonly setFaviconError: (value: boolean) => void;
  readonly logoError: boolean;
  readonly setLogoError: (value: boolean) => void;
  readonly displayHost: string | null;
  readonly logoUrl: string | null;
}
