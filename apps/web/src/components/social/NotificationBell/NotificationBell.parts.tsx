import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, RefreshCw, X } from 'lucide-react';
import type { AniListNotification } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAniListNotificationsStore } from '@/stores/useAniListNotificationsStore';
import { NotificationRow } from '../NotificationRow';

const SKELETON_ROWS = [0, 1, 2, 3];

interface NotificationPanelBodyProps {
  notifications: AniListNotification[];
  isLoading: boolean;
  error: string | null;
  /** Unread count snapshotted when the panel opened — tints the first N rows. */
  unreadCount: number;
  onRetry: () => void;
}

/** The click-away dropdown panel: header + scrollable notification list. */
export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('social');
  const notifications = useAniListNotificationsStore(s => s.notifications);
  const isLoading = useAniListNotificationsStore(s => s.isLoading);
  const error = useAniListNotificationsStore(s => s.error);
  const panelRef = useRef<HTMLDivElement>(null);

  // Opening the panel marks everything read (zeroing the badge), so snapshot the
  // unread count once on mount to keep tinting the rows that WERE unread —
  // otherwise every row would look identical the instant the panel appears.
  const [unreadSnapshot] = useState(() => useAniListNotificationsStore.getState().unreadCount);

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
        'rounded-lg border border-border-glass bg-card/95 backdrop-blur-[18px]',
        'shadow-xl shadow-black/40',
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
            'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
            'transition duration-150 active:scale-[0.96]',
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
          unreadCount={unreadSnapshot}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
}

function NotificationPanelBody({
  notifications,
  isLoading,
  error,
  unreadCount,
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
        <p className="text-xs text-muted-foreground leading-snug break-words max-w-[40ch]">
          {t('notifications.error')}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          {t('notifications.retry')}
        </Button>
      </div>
    );
  }

  // Stale-while-revalidate: only flash skeletons on the very first load. A
  // refetch (reopen / retry) keeps the cached rows on screen so the panel
  // doesn't blank out every time it opens.
  if (isLoading && notifications.length === 0) {
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
        <div className="grid place-items-center w-9 h-9 rounded-lg border border-border-glass bg-foreground/5 text-muted-foreground/60">
          <Bell className="w-4 h-4" aria-hidden="true" />
        </div>
        <p className="text-xs text-muted-foreground leading-snug max-w-[34ch]">
          {t('notifications.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {notifications.map((n, i) => (
        <NotificationRow key={n.id} notification={n} unread={i < unreadCount} />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-2 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <Skeleton className="w-9 h-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-1/4" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}
