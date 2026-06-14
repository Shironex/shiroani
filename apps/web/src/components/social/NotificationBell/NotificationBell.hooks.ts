import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import {
  useAniListNotificationsStore,
  startNotificationsPolling,
  stopNotificationsPolling,
} from '@/stores/useAniListNotificationsStore';
import type { INotificationBellView } from './NotificationBell.types';

/** Cap the badge display so a large count doesn't blow out the pill width. */
function formatBadge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function useNotificationBell(): INotificationBellView {
  const { t } = useTranslation('social');
  const connected = useAniListAuthStore(s => s.status.connected);
  const unreadCount = useAniListNotificationsStore(s => s.unreadCount);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Background unread-count polling — gated on connection.
  useEffect(() => {
    if (!connected) {
      stopNotificationsPolling();
      return;
    }
    startNotificationsPolling();
    return () => {
      stopNotificationsPolling();
    };
  }, [connected]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    const store = useAniListNotificationsStore.getState();
    // Sequence matters: GET_NOTIFICATIONS writes back the real unread count, so it
    // must settle BEFORE markAllRead zeroes the badge — otherwise a late GET would
    // re-arm the badge the user just cleared by opening the panel.
    void store.fetchNotifications().then(() => store.markAllRead());
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Click-away + Escape to close. Only wired while open.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, handleClose]);

  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? t('notifications.openWithCount', { count: unreadCount })
    : t('notifications.open');
  const onToggle = () => (open ? handleClose() : handleOpen());

  return {
    connected,
    open,
    hasUnread,
    badge: formatBadge(unreadCount),
    label,
    containerRef,
    buttonRef,
    onToggle,
    onClose: handleClose,
  };
}
