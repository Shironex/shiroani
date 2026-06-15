export type IGeneralSectionProps = Record<string, never>;

export interface IGeneralSectionView {
  readonly autoLaunch: boolean;
  readonly feedRefreshOnStartup: boolean;
  readonly loaded: boolean;
  readonly displayName: string;
  readonly setDisplayName: (value: string) => void;
  readonly handleAutoLaunchChange: (enabled: boolean) => Promise<void>;
  readonly handleFeedRefreshOnStartupChange: (enabled: boolean) => Promise<void>;
}
