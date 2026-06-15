export type IAboutSectionProps = Record<string, never>;

export interface IAboutSectionView {
  readonly version: string;
  readonly resetOnboarding: () => void;
}
