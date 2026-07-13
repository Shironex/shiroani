import { useTranslation } from 'react-i18next';
import { Bell, Heart, Tv, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AniListNotification } from '@shiroani/shared';
import { formatRelativeTime } from '@/lib/relative-time';
import type { INotificationRowView } from './NotificationRow.types';

/**
 * Icon + chip colour per notification kind, surfaced in the row's type badge —
 * so airing / following / related-media / activity read apart at a glance
 * instead of all sharing one monochrome primary chip.
 */
const TYPE_ICON: Record<AniListNotification['type'], { icon: LucideIcon; className: string }> = {
  airing: { icon: Tv, className: 'bg-status-info-bg text-status-info' },
  following: { icon: UserPlus, className: 'bg-status-success-bg text-status-success' },
  activity: { icon: Heart, className: 'bg-primary/15 text-primary' },
  'related-media': { icon: Bell, className: 'bg-status-warning-bg text-status-warning' },
};

export function useNotificationRow(notification: AniListNotification): INotificationRowView {
  const { t: tBrowser } = useTranslation('browser');
  const relative = formatRelativeTime(notification.createdAt * 1000, tBrowser);
  const { icon: TypeIcon, className: typeIconClassName } = TYPE_ICON[notification.type];
  return { relative, TypeIcon, typeIconClassName };
}
