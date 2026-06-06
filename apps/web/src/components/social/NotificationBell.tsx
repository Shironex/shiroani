import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import {
  useAniListNotificationsStore,
  startNotificationsPolling,
  stopNotificationsPolling,
} from '@/stores/useAniListNotificationsStore';
import { NotificationRow } from './NotificationRow';

const SKELETON_ROWS = [0, 1, 2, 3];

/** Cap the badge display so a large count doesn't blow out the pill width. */
function formatBadge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/**
 * Global AniList notifications bell — an icon button (with an unread badge) that
 * lives in the {@link TitleBar} chrome and opens a click-away dropdown panel.
 *
 * Lifecycle:
 *  - Gentle 60s background poll of the unread count (module-level interval in
 *    the store), started on mount, stopped on unmount.
 *  - On open: fetch the full list (GET_NOTIFICATIONS) then mark all read
 *    (MARK_NOTIFICATIONS_READ) to clear the badge.
 *
 * Gated on `status.connected`: renders nothing when disconnected (the feature is
 * meaningless without an AniList account, and the count is forced to 0). Since
 * `connected` requires the Electron-only `anilistAuth` bridge, the bell only
 * ever appears in Electron — exactly when the host TitleBar is on screen.
 *
 * Lives in the TitleBar (the app's only persistent top chrome), so it overlaps
 * nothing — not each view's ViewHeader action cluster, not the browser tab
 * bar/toolbar, not the dock. The panel is rendered `fixed` just below the 28px
 * bar.
 */
export function NotificationBell() {
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
    // Sequence matters: GET_NOTIFICATIONS is read-only and writes back the real
    // unread count, so it must settle BEFORE markAllRead zeroes the badge —
    // otherwise a late GET would re-arm the badge the user just cleared by
    // opening the panel.
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

  if (!connected) return null;

  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? t('notifications.openWithCount', { count: unreadCount })
    : t('notifications.open');

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? handleClose() : handleOpen())}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'relative grid place-items-center w-6 h-6 rounded-md',
          'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'text-foreground bg-foreground/5'
        )}
      >
        <Bell className="w-3.5 h-3.5" />
        {hasUnread && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 grid place-items-center',
              'rounded-full bg-primary text-primary-foreground',
              'text-[8px] font-bold leading-none tabular-nums',
              'border border-sidebar'
            )}
          >
            {formatBadge(unreadCount)}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={handleClose} />}
    </div>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('social');
  const notifications = useAniListNotificationsStore(s => s.notifications);
  const isLoading = useAniListNotificationsStore(s => s.isLoading);
  const error = useAniListNotificationsStore(s => s.error);
  const panelRef = useRef<HTMLDivElement>(null);

  // role="dialog" promises focus moves into the panel on open — move it here so
  // keyboard/screen-reader users land inside (focus returns to the bell on close).
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const handleRetry = useCallback(() => {
    void useAniListNotificationsStore.getState().fetchNotifications();
  }, []);

  return (
    <div
      ref={panelRef}
      role="dialog"
      tabIndex={-1}
      aria-label={t('notifications.title')}
      className={cn(
        'fixed top-7 right-3 z-50 w-[340px] max-w-[calc(100vw-1.5rem)]',
        'rounded-xl border border-border-glass bg-card/95 backdrop-blur-[18px]',
        'shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]',
        'animate-fade-in overflow-hidden'
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-glass">
        <h2 className="text-[13px] font-semibold text-foreground">{t('notifications.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('notifications.close')}
          className={cn(
            'grid place-items-center w-6 h-6 rounded-md',
            'text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2.5">
        <NotificationPanelBody
          notifications={notifications}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
}

interface NotificationPanelBodyProps {
  notifications: ReturnType<typeof useAniListNotificationsStore.getState>['notifications'];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function NotificationPanelBody({
  notifications,
  isLoading,
  error,
  onRetry,
}: NotificationPanelBodyProps) {
  const { t } = useTranslation('social');

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-3 rounded-lg px-4 py-5 text-center',
          'border border-destructive/25 bg-destructive/[0.06]'
        )}
      >
        <p className="text-[12px] text-muted-foreground leading-snug break-words max-w-[40ch]">
          {t('notifications.error')}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          {t('notifications.retry')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-1.5"
        aria-busy="true"
        aria-label={t('notifications.loadingAria')}
      >
        {SKELETON_ROWS.map(i => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
        <div className="grid place-items-center w-9 h-9 rounded-xl border border-border-glass bg-foreground/5 text-muted-foreground/60">
          <Bell className="w-4 h-4" aria-hidden="true" />
        </div>
        <p className="text-[12px] text-muted-foreground/70 leading-snug max-w-[34ch]">
          {t('notifications.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {notifications.map(n => (
        <NotificationRow key={n.id} notification={n} />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-2 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <div className="w-9 h-9 shrink-0 rounded-full bg-foreground/5 animate-pulse" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-2.5 w-1/4 rounded bg-foreground/5 animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-foreground/5 animate-pulse" />
      </div>
    </div>
  );
}
