import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationBell } from './NotificationBell.hooks';
import { NotificationPanel } from './NotificationBell.parts';

/**
 * Global AniList notifications bell — an icon button (with an unread badge) that
 * lives in the TitleBar chrome and opens a click-away dropdown panel. Renders
 * nothing when disconnected: the feature is meaningless without an AniList
 * account, and `connected` requires the Electron-only bridge.
 */
export default function NotificationBell() {
  const { connected, open, hasUnread, badge, label, containerRef, buttonRef, onToggle, onClose } =
    useNotificationBell();

  if (!connected) return null;

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'relative grid place-items-center w-6 h-6 rounded-md',
          'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
          'transition duration-150 active:scale-[0.96]',
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
            {badge}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={onClose} />}
    </div>
  );
}
