export type ISupportBannerProps = Record<string, never>;

export interface ISupportBannerView {
  readonly seen: boolean;
  readonly setSeen: () => void;
  readonly openCoffeeLink: () => void;
  readonly openSponsorsLink: () => void;
}
