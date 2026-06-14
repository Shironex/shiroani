import { useTranslation } from 'react-i18next';
import { Bell, Heart, Tv, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AniListNotification } from '@shiroani/shared';
import { formatRelativeTime } from '@/lib/relative-time';
import type { INotificationRowView } from './NotificationRow.types';

/** Icon per notification kind, surfaced in the row's type badge. */
const TYPE_ICON: Record<AniListNotification['type'], LucideIcon> = {
  airing: Tv,
  following: UserPlus,
  activity: Heart,
  'related-media': Bell,
};

export function useNotificationRow(notification: AniListNotification): INotificationRowView {
  const { t: tBrowser } = useTranslation('browser');
  const relative = formatRelativeTime(notification.createdAt * 1000, tBrowser);
  const TypeIcon = TYPE_ICON[notification.type];
  return { relative, TypeIcon };
}
