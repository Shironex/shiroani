import type { AniListNotification } from '@shiroani/shared';
import type { LucideIcon } from 'lucide-react';

export interface INotificationRowProps {
  notification: AniListNotification;
  /** Tints the row as unread (snapshot taken when the panel opens). */
  unread?: boolean;
}

export interface INotificationRowView {
  readonly relative: string;
  readonly TypeIcon: LucideIcon;
  /** Chip background + text colour for the notification kind. */
  readonly typeIconClassName: string;
}
