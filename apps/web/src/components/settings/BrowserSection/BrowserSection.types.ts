import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';

export type IBrowserSectionProps = Record<string, never>;

export interface IBrowserSectionView {
  readonly adblockEnabled: boolean;
  readonly setAdblockEnabled: (value: boolean) => void;
  readonly popupBlockEnabled: boolean;
  readonly setPopupBlockEnabled: (value: boolean) => void;
  readonly adblockWhitelist: string[];
  readonly removeAdblockDomain: (host: string) => void;
  readonly restoreTabsOnStartup: boolean;
  readonly setRestoreTabsOnStartup: (value: boolean) => void;
  readonly splitTabsEnabled: boolean;
  readonly setSplitTabsEnabled: (value: boolean) => void;
  readonly trackFrequentSites: boolean;
  readonly setTrackFrequentSites: (value: boolean) => void;
  readonly autoTrackProgress: boolean;
  readonly setAutoTrackProgress: (value: boolean) => void;
  readonly whitelistInput: string;
  readonly setWhitelistInput: Dispatch<SetStateAction<string>>;
  readonly handleAddWhitelist: () => void;
  readonly handleWhitelistKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}
