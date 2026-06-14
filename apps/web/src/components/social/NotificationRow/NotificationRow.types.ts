import type { AniListNotification } from '@shiroani/shared';
import type { LucideIcon } from 'lucide-react';

export interface INotificationRowProps {
  notification: AniListNotification;
}

export interface INotificationRowView {
  readonly relative: string;
  readonly TypeIcon: LucideIcon;
}
