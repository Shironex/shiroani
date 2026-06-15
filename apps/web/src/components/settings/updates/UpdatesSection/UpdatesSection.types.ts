import type {
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateStatus,
  UpdateChannel,
} from '@shiroani/shared';
import type { StatusTone } from '@/components/settings/updates/StatusPill';

export type IUpdatesSectionProps = Record<string, never>;

export interface IUpdatesSectionView {
  readonly version: string;
  readonly status: UpdateStatus;
  readonly updateInfo: UpdateInfo | null;
  readonly progress: UpdateDownloadProgress | null;
  readonly channel: UpdateChannel;
  readonly isChannelSwitching: boolean;
  readonly isMac: boolean;
  readonly statusText: string;
  readonly statusTone: StatusTone;
  readonly updateLocked: boolean;
  readonly lastCheckedLabel: string | null;
  readonly checkForUpdates: () => void;
  readonly startDownload: () => void;
  readonly installNow: () => void;
  readonly setChannel: (channel: UpdateChannel) => void;
  readonly openReleasesPage: () => void;
}
