import type { FullSyncDirection, FullSyncPushMode } from '@shiroani/shared';

/** Provider whose i18n keys (`anilist.*` / `mal.*`) back the labels. */
export type SyncProvider = 'anilist' | 'mal';

export interface ISyncModeSelectorProps {
  provider: SyncProvider;
  value: FullSyncDirection;
  onChange: (mode: FullSyncDirection) => void;
  disabled?: boolean;
}

export interface IPushLibraryButtonProps {
  provider: SyncProvider;
  onPush: (mode: FullSyncPushMode) => void;
  disabled?: boolean;
}

export interface IPushLibraryButtonView {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly pushMode: FullSyncPushMode;
  readonly setPushMode: (mode: FullSyncPushMode) => void;
}
